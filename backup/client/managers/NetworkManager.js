import { supabase, TABLES, CHANNELS } from '../config/supabase.js'

export class NetworkManager {
  constructor() {
    this.isConnected = false
    this.playerId = null
    this.otherPlayers = new Map()
    this.channels = new Map()
    this.lastUpdateTime = 0
    this.updateInterval = 100 // Send updates every 100ms
    this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9) // Unique session ID
    this.joinLeaveEvents = new Map() // Track recent join/leave events
    this.failedPlayerCache = new Map() // Cache failed player lookups to prevent repeated requests
    this.activePlayerRequests = new Map() // Track active requests to prevent duplicates
    this.missingPlayerIds = new Set(); // Track missing/bad player IDs
    this.ownPresenceState = 'unknown'; // Track own presence state for debug
    this.suppressed406 = new Set(); // Track playerIds with 406 errors
    this.suppressAuthSessionMissing = true; // Toggle to show/hide AuthSessionMissingError
  }

  async init() {
    try {
      console.log('Initializing NetworkManager...', 'Session ID:', this.sessionId)

      // Get current user with retry for timing issues after registration
      let user = null
      let retries = 0
      const maxRetries = 3
      
      while (!user && retries < maxRetries) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        user = currentUser
        
        if (!user) {
          retries++
          console.log(`Auth retry ${retries}/${maxRetries}...`)
          await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms
        }
      }
      
      if (!user) {
        throw new Error('No authenticated user found after retries')
      }

      this.playerId = user.id
      console.log('Player ID:', this.playerId, 'Session:', this.sessionId)

      // Set up real-time channels
      await this.setupRealtimeChannels()
      
      // Load other players
      await this.loadOtherPlayers()

      // Set up cleanup handlers
      this.setupUnloadHandler()

      // Clean up old cache entries every 10 minutes to prevent memory leaks
      setInterval(() => {
        this.cleanupCaches()
      }, 600000) // 10 minutes

      this.isConnected = true
      console.log('NetworkManager initialized successfully')
      console.warn(`[DEBUG] NetworkManager CONNECTED for PlayerId: ${this.playerId} Session: ${this.sessionId}`)

    } catch (error) {
      console.error('Error initializing NetworkManager:', error)
      throw error
    }
  }

  async setupRealtimeChannels() {
    // Player positions channel
    const positionChannel = supabase.channel(CHANNELS.PLAYER_POSITIONS)
      .on('broadcast', { event: 'player_move' }, (payload) => {
        this.handlePlayerMove(payload)
      })
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync()
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePlayerJoin(key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePlayerLeave(key, leftPresences)
      })
      .subscribe()

    this.channels.set(CHANNELS.PLAYER_POSITIONS, positionChannel)

    // Chat channel
    const chatChannel = supabase.channel(CHANNELS.CHAT)
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        this.handleChatMessage(payload)
      })
      .subscribe()

    this.channels.set(CHANNELS.CHAT, chatChannel)

    // World events channel
    const worldChannel = supabase.channel(CHANNELS.WORLD_EVENTS)
      .on('broadcast', { event: 'world_event' }, (payload) => {
        this.handleWorldEvent(payload)
      })
      .subscribe()

    this.channels.set(CHANNELS.WORLD_EVENTS, worldChannel)

    console.log('Real-time channels set up')
  }

  async loadOtherPlayers() {
    try {
      // Get all characters except current player
      const { data: characters, error } = await supabase
        .from(TABLES.CHARACTERS)
        .select(`
          *,
          ${TABLES.PLAYERS}:player_id (username)
        `)
        .neq('player_id', this.playerId)

      if (error) throw error

      // Store other players
      characters?.forEach(character => {
        if (character.players) {
          this.otherPlayers.set(character.player_id, {
            id: character.player_id,
            name: character.players.username,
            character: character,
            lastUpdate: Date.now(),
            isOnline: false // Will be updated by presence
          })
        }
      })

      console.log('Loaded other players:', this.otherPlayers.size)

    } catch (error) {
      console.error('Error loading other players:', error)
    }
  }

  // Player movement handling
  sendPlayerUpdate(playerData) {
    if (!this.isConnected || !playerData) return

    const now = Date.now()
    if (now - this.lastUpdateTime < this.updateInterval) return

    this.lastUpdateTime = now

    // Send position update via broadcast
    const positionChannel = this.channels.get(CHANNELS.PLAYER_POSITIONS)
    if (positionChannel) {
      positionChannel.send({
        type: 'broadcast',
        event: 'player_move',
        payload: {
          player_id: this.playerId,
          x: playerData.x,
          y: playerData.y,
          direction: playerData.direction,
          timestamp: now
        }
      })
    }

    // Update presence
    positionChannel?.track({
      player_id: this.playerId,
      x: playerData.x,
      y: playerData.y,
      timestamp: now
    })

    // Update database (less frequently)
    this.updatePlayerDatabase(playerData)
  }

  async updatePlayerDatabase(playerData) {
    try {
      // Only update database every 5 seconds to reduce load
      if (Date.now() - this.lastDatabaseUpdate < 5000) return
      this.lastDatabaseUpdate = Date.now()

      await supabase
        .from(TABLES.CHARACTERS)
        .update({
          x: Math.round(playerData.x),
          y: Math.round(playerData.y),
          health: playerData.health,
          mana: playerData.mana,
          last_update: new Date().toISOString()
        })
        .eq('player_id', this.playerId)

    } catch (error) {
      console.error('Error updating player database:', error)
    }
  }

  handlePlayerMove(payload) {
    const { player_id, x, y, direction, timestamp } = payload.payload

    if (player_id === this.playerId) return // Ignore own updates

    const player = this.otherPlayers.get(player_id)
    if (player) {
      player.character.x = x
      player.character.y = y
      player.character.direction = direction
      player.lastUpdate = timestamp
      player.isOnline = true
    }
  }

  handlePresenceSync() {
    const positionChannel = this.channels.get(CHANNELS.PLAYER_POSITIONS)
    if (!positionChannel) return

    const presenceState = positionChannel.presenceState()
    const onlinePlayerIds = Object.keys(presenceState)
    
    // Clean up old join/leave events (older than 30 seconds)
    const now = Date.now()
    for (const [eventKey, timestamp] of this.joinLeaveEvents.entries()) {
      if (now - timestamp > 30000) {
        this.joinLeaveEvents.delete(eventKey)
      }
    }
    
    // Update online status for all players
    this.otherPlayers.forEach((player, playerId) => {
      const wasOnline = player.isOnline
      player.isOnline = !!presenceState[playerId]
      
      if (wasOnline !== player.isOnline) {
        console.log('🔄 Player status changed:', playerId, wasOnline ? 'online→offline' : 'offline→online')
      }
    })
    
    // Load any new players we haven't seen before
    // Block problematic player IDs from presence handling
    const BLOCKED_PLAYER_IDS = [
      '83028a36-625b-11f0-ad2f-0a58a9feac02',
      '4703ce88-625f-11f0-8eec-0a58a9feac02'
    ]
    Object.keys(presenceState).forEach(async playerId => {
      if (BLOCKED_PLAYER_IDS.includes(playerId)) {
        return // Skip entirely to stop the spam
      }
      if (playerId !== this.playerId && !this.otherPlayers.has(playerId)) {
        // Skip this specific problematic player that's causing 406 errors
        if (playerId === '83028a36-625b-11f0-ad2f-0a58a9feac02') {
          return // Skip entirely to stop the 406 spam
        }
        
        // Only log new player loading once per 30 seconds to reduce spam
        const newPlayerLogKey = `new_player_log_${playerId}`
        const lastNewPlayerLog = this.joinLeaveEvents.get(newPlayerLogKey)
        
        if (!lastNewPlayerLog || (now - lastNewPlayerLog) > 30000) {
          console.log('🆕 Loading new player from presence sync:', playerId)
          this.joinLeaveEvents.set(newPlayerLogKey, now)
        }
        
        const playerData = await this.loadPlayer(playerId)
        
        if (playerData) {
          this.otherPlayers.set(playerId, playerData)
          // Only log successful addition once per 30 seconds
          if (!lastNewPlayerLog || (now - lastNewPlayerLog) > 30000) {
            console.log('Added new player from presence:', playerData.username)
          }
        }
      }
    })

    // Only log presence sync every 30 seconds to reduce spam
    const presenceSyncLogKey = 'presence_sync_log'
    const lastPresenceSyncLog = this.joinLeaveEvents.get(presenceSyncLogKey)
    
    if (!lastPresenceSyncLog || (now - lastPresenceSyncLog) > 30000) {
      console.log('🔄 Presence synced, online players:', onlinePlayerIds.length, 'IDs:', onlinePlayerIds.slice(0, 3).join(', ') + (onlinePlayerIds.length > 3 ? '...' : ''), 'Session:', this.sessionId)
      this.joinLeaveEvents.set(presenceSyncLogKey, now)
    }

    // Log presence state
    console.info('[DEBUG] Presence state:', presenceState)
    // Log own presence
    if (this.playerId && presenceState[this.playerId]) {
      if (this.ownPresenceState !== 'online') {
        console.warn(`[DEBUG] YOU joined the game! PlayerId: ${this.playerId} Session: ${this.sessionId}`)
        this.ownPresenceState = 'online'
      }
    } else if (this.playerId && this.ownPresenceState === 'online') {
      console.warn(`[DEBUG] YOU left the game! PlayerId: ${this.playerId} Session: ${this.sessionId}`)
      this.ownPresenceState = 'offline'
    }
  }

  async handlePlayerJoin(key, newPresences) {
    // Skip this specific problematic player that's causing 406 errors
    if (key === '83028a36-625b-11f0-ad2f-0a58a9feac02') {
      return // Skip entirely to stop the 406 spam
    }
    
    // Track this join event to prevent spam
    const now = Date.now()
    const eventKey = `join_${key}`
    const lastEvent = this.joinLeaveEvents.get(eventKey)
    
    // Rate limit: ignore if same player joined within last 2 seconds  
    if (lastEvent && (now - lastEvent) < 2000) {
      // Only log warning every 10 seconds to reduce spam
      const warningKey = `join_warning_${key}`
      const lastWarning = this.joinLeaveEvents.get(warningKey)
      if (!lastWarning || (now - lastWarning) > 10000) {
        console.log('⚠️ Rapid join detected for player:', key, 'ignoring (potential spam)')
        this.joinLeaveEvents.set(warningKey, now)
      }
      return
    }
    
    this.joinLeaveEvents.set(eventKey, now)
    
    console.log('✅ Player joined:', key, newPresences?.length ? `(${newPresences.length} presences)` : '', 'Session:', this.sessionId)
    
    // Don't load ourselves
    if (key === this.playerId) return
    
    // Update player online status if they already exist
    const existingPlayer = this.otherPlayers.get(key)
    if (existingPlayer) {
      existingPlayer.isOnline = true
      console.log('Updated existing player online status:', key)
    } else {
      // Load new player data (logging handled in loadPlayer method to reduce spam)
      const playerData = await this.loadPlayer(key)
      
      if (playerData) {
        this.otherPlayers.set(key, playerData)
        // Only log successful addition once per 30 seconds to reduce spam
        const now = Date.now()
        const addedLogKey = `added_log_${key}`
        const lastAddedLog = this.joinLeaveEvents.get(addedLogKey)
        
        if (!lastAddedLog || (now - lastAddedLog) > 30000) {
          console.log('Added new player:', playerData.username)
          this.joinLeaveEvents.set(addedLogKey, now)
        }
      } else {
        // Only log failure once per 5 minutes to reduce spam  
        const now = Date.now()
        const failLogKey = `fail_log_${key}`
        const lastFailLog = this.joinLeaveEvents.get(failLogKey)
        
        if (!lastFailLog || (now - lastFailLog) > 300000) {
          console.log('Could not load player data for:', key)
          this.joinLeaveEvents.set(failLogKey, now)
        }
      }
    }
  }

  handlePlayerLeave(key, leftPresences) {
    // Track this leave event
    const now = Date.now()
    const eventKey = `leave_${key}`
    const lastEvent = this.joinLeaveEvents.get(eventKey)
    
    // Rate limit: ignore if same player left within last 2 seconds
    if (lastEvent && (now - lastEvent) < 2000) {
      // Only log warning every 10 seconds to reduce spam
      const warningKey = `leave_warning_${key}`
      const lastWarning = this.joinLeaveEvents.get(warningKey)
      if (!lastWarning || (now - lastWarning) > 10000) {
        console.log('⚠️ Rapid leave detected for player:', key, 'ignoring (potential spam)')
        this.joinLeaveEvents.set(warningKey, now)
      }
      return
    }
    
    this.joinLeaveEvents.set(eventKey, now)
    
    console.log('❌ Player left:', key, leftPresences?.length ? `(${leftPresences.length} presences)` : '', 'Session:', this.sessionId)
    
    // Update player online status
    const player = this.otherPlayers.get(key)
    if (player) {
      player.isOnline = false
      console.log('Updated player offline status:', key)
    }
  }

  async loadPlayer(playerId) {
    try {
      const now = Date.now()
      
      // Check if player lookup failed recently - if so, don't retry for 5 minutes
      const failedCacheKey = `failed_${playerId}`
      const lastFailed = this.failedPlayerCache.get(failedCacheKey)
      if (lastFailed && (now - lastFailed) < 300000) { // 5 minutes
        return null // Skip request entirely
      }
      
      // Check if there's already an active request for this player
      const activeRequestKey = `request_${playerId}`
      if (this.activePlayerRequests.has(activeRequestKey)) {
        return null // Don't make duplicate requests
      }
      
      // Only log if we haven't seen this player recently to reduce spam
      const loadLogKey = `load_log_${playerId}`
      const lastLoadLog = this.joinLeaveEvents.get(loadLogKey)
      
      if (!lastLoadLog || (now - lastLoadLog) > 30000) { // Log once per 30 seconds max
        console.log('Loading player data for:', playerId)
        this.joinLeaveEvents.set(loadLogKey, now)
      }
      
      // Mark request as active
      this.activePlayerRequests.set(activeRequestKey, now)
      
      try {
        // Try to load player and character data
        const { data: player, error: playerError } = await supabase
          .from(TABLES.PLAYERS)
          .select('username, is_online')
          .eq('id', playerId)
          .single()

        if (playerError) {
          // Cache this failure to prevent repeated requests
          this.failedPlayerCache.set(failedCacheKey, now)
          
          if (playerError.code === 'PGRST116') {
            // Only log "not found" message once per hour per player to reduce spam
            const notFoundLogKey = `not_found_${playerId}`
            const lastNotFoundLog = this.joinLeaveEvents.get(notFoundLogKey)
            if (!lastNotFoundLog || (now - lastNotFoundLog) > 3600000) {
              console.log(`Player ${playerId} not found in database (new player)`)
              this.joinLeaveEvents.set(notFoundLogKey, now)
            }
          } else {
            console.warn('Player loading error:', playerError)
          }
          return null
        }
        
        // Clear any previous failure cache on success
        this.failedPlayerCache.delete(failedCacheKey)
      } finally {
        // Always clear the active request marker
        this.activePlayerRequests.delete(activeRequestKey)
      }

      const { data: character, error: characterError } = await supabase
        .from(TABLES.CHARACTERS)
        .select('name, x, y, level')
        .eq('player_id', playerId)
        .single()

      if (characterError) {
        if (characterError.code === 'PGRST116') {
          console.log(`Character for ${playerId} not found in database`)
        } else {
          console.warn('Character loading error:', characterError)
        }
        return null
      }

      return {
        id: playerId,
        username: player.username,
        isOnline: player.is_online,
        character: {
          name: character.name,
          x: character.x,
          y: character.y,
          level: character.level
        },
        lastUpdate: Date.now()
      }

    } catch (error) {
      if (error?.message?.includes('406')) {
        if (!this.suppressed406.has(playerId)) {
          this.suppressed406.add(playerId);
          console.warn(`[DEBUG] 406 error loading player: ${playerId} | Session:`, this.sessionId);
        }
        // Do not log repeated 406s for the same playerId
      } else if (this.suppressAuthSessionMissing && error?.message?.includes('Auth session missing')) {
        // Suppress AuthSessionMissingError unless debug mode
      } else {
        console.error(`[DEBUG] Error loading player: ${playerId}`, error)
      }
      // Only log if it's not a "no rows" error - reduce noise
      if (error.code !== 'PGRST116') {
        console.warn('Error loading player:', error)
      }
      return null
    }
  }

  // Chat handling
  sendChatMessage(message) {
    if (!this.isConnected || !message.trim()) return

    const chatChannel = this.channels.get(CHANNELS.CHAT)
    if (chatChannel) {
      chatChannel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: {
          player_id: this.playerId,
          message: message.trim(),
          timestamp: Date.now()
        }
      })
    }

    // Also store in database for persistence
    this.storeChatMessage(message)
  }

  async storeChatMessage(message) {
    try {
      await supabase
        .from(TABLES.CHAT_MESSAGES)
        .insert({
          player_id: this.playerId,
          message: message,
          timestamp: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error storing chat message:', error)
    }
  }

  handleChatMessage(payload) {
    const { player_id, message, timestamp } = payload.payload

    if (player_id === this.playerId) return // Ignore own messages

    const player = this.otherPlayers.get(player_id)
    const senderName = player ? player.name : 'Unknown Player'

    // Emit chat message event
    this.onChatMessage?.(senderName, message, 'other')
  }

  // World events handling
  sendWorldEvent(eventType, eventData) {
    if (!this.isConnected) return

    const worldChannel = this.channels.get(CHANNELS.WORLD_EVENTS)
    if (worldChannel) {
      worldChannel.send({
        type: 'broadcast',
        event: 'world_event',
        payload: {
          player_id: this.playerId,
          event_type: eventType,
          event_data: eventData,
          timestamp: Date.now()
        }
      })
    }
  }

  // Method to send world events
  sendWorldEvent(eventType, eventData) {
    if (!this.isConnected) return

    const worldChannel = this.channels.get(CHANNELS.WORLD_EVENTS)
    if (worldChannel) {
      worldChannel.send({
        type: 'broadcast',
        event: 'world_event',
        payload: {
          player_id: this.playerId,
          event_type: eventType,
          event_data: eventData,
          timestamp: Date.now()
        }
      })
    }
  }

  handleWorldEvent(payload) {
    const { player_id, event_type, event_data, timestamp } = payload.payload

    if (player_id === this.playerId) return // Ignore own events

    console.log('World event received:', event_type, event_data)
    
    // Emit world event
    this.onWorldEvent?.(event_type, event_data, player_id)
  }

  // Rendering
  renderOtherPlayers(ctx, camera) {
    this.otherPlayers.forEach((player) => {
      if (!player.isOnline) return

      const character = player.character
      const screenPos = camera.worldToScreen(character.x, character.y)

      // Don't render if off screen
      if (screenPos.x < -50 || screenPos.x > camera.width + 50 ||
          screenPos.y < -50 || screenPos.y > camera.height + 50) {
        return
      }

      this.renderPlayer(ctx, player, screenPos)
    })
  }

  renderPlayer(ctx, player, screenPos) {
    const character = player.character

    // Player body (simple rectangle for now)
    ctx.fillStyle = '#4444ff'
    ctx.fillRect(screenPos.x - 16, screenPos.y - 24, 32, 48)

    // Player name
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(screenPos.x - 30, screenPos.y - 40, 60, 16)
    
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(player.name, screenPos.x, screenPos.y - 32)
    ctx.textAlign = 'left'

    // Health bar
    const healthPercent = character.health / character.max_health
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(screenPos.x - 20, screenPos.y - 50, 40 * healthPercent, 4)
    ctx.strokeStyle = '#000'
    ctx.strokeRect(screenPos.x - 20, screenPos.y - 50, 40, 4)
  }

  // Utility methods
  getOtherPlayers() {
    return Array.from(this.otherPlayers.values())
  }

  getOnlinePlayers() {
    return Array.from(this.otherPlayers.values()).filter(p => p.isOnline)
  }

  isPlayerOnline(playerId) {
    const player = this.otherPlayers.get(playerId)
    return player ? player.isOnline : false
  }

  // Update method (called from game loop)
  update(deltaTime) {
    // Clean up old player data
    const now = Date.now()
    this.otherPlayers.forEach((player, playerId) => {
      if (now - player.lastUpdate > 30000) { // 30 seconds timeout
        player.isOnline = false
      }
    })
  }

  async disconnect() {
    console.log('🔌 Disconnecting NetworkManager...', 'Session:', this.sessionId)
    console.warn(`[DEBUG] NetworkManager.disconnect() called for PlayerId: ${this.playerId} Session: ${this.sessionId}`)
    
    try {
      // Unsubscribe from all channels
      for (const [channelName, channel] of this.channels) {
        console.log('Unsubscribing from channel:', channelName)
        await channel.unsubscribe()
      }
      
      this.channels.clear()
      this.otherPlayers.clear()
      this.joinLeaveEvents.clear()
      this.isConnected = false
      
      console.log('✅ NetworkManager disconnected successfully')
    } catch (error) {
      console.error('❌ Error during NetworkManager disconnect:', error)
    }
  }

  // Call this when the page is about to unload
  setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      this.disconnect()
    })
    
    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🙈 Tab hidden, potential disconnect coming')
      } else {
        console.log('👁️ Tab visible again')
      }
    })
  }

  cleanupCaches() {
    const now = Date.now()
    const oneHour = 3600000
    
    // Clean up old join/leave events (older than 1 hour)
    for (const [key, timestamp] of this.joinLeaveEvents.entries()) {
      if (now - timestamp > oneHour) {
        this.joinLeaveEvents.delete(key)
      }
    }
    
    // Clean up old failed player cache entries (older than 1 hour)
    for (const [key, timestamp] of this.failedPlayerCache.entries()) {
      if (now - timestamp > oneHour) {
        this.failedPlayerCache.delete(key)
      }
    }
    
    // Clean up very old active requests (shouldn't happen, but safety check)
    for (const [key, timestamp] of this.activePlayerRequests.entries()) {
      if (now - timestamp > 30000) { // 30 seconds
        this.activePlayerRequests.delete(key)
      }
    }
    
    console.log('NetworkManager caches cleaned up')
  }

  // Cleanup
  destroy() {
    // Unsubscribe from all channels
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    
    this.channels.clear()
    this.otherPlayers.clear()
    this.joinLeaveEvents.clear()
    this.failedPlayerCache.clear()
    this.activePlayerRequests.clear()
    this.isConnected = false
    
    console.log('NetworkManager destroyed')
  }

  // Callbacks (set by game)
  onChatMessage = null
  onWorldEvent = null
} 