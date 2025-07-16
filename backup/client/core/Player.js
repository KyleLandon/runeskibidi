import { supabase, TABLES } from '../config/supabase.js'

export class Player {
  constructor() {
    // Position and movement
    this.x = 512
    this.y = 384
    this.targetX = 512
    this.targetY = 384
    this.speed = 200 // pixels per second
    this.isMoving = false
    this.direction = 'down' // up, down, left, right
    
    // Character stats
    this.name = 'Player'
    this.level = 1
    this.experience = 0
    this.health = 100
    this.maxHealth = 100
    this.mana = 50
    this.maxMana = 50
    
    // Movement keys
    this.movementKeys = {
      w: false,
      a: false,
      s: false,
      d: false
    }
    
    // Animation
    this.animFrame = 0
    this.animSpeed = 8 // frames per second
    this.lastAnimUpdate = 0
    
    // Player ID from auth
    this.playerId = null
    
    // Size
    this.width = 32
    this.height = 48
    
    // Tool usage
    this.currentTool = null
    this.isUsingTool = false
    this.lastToolUse = 0
    this.toolCooldown = 1000 // 1 second cooldown between tool uses
    
    // World reference (set by Game.js)
    this.world = null
  }

  async init() {
    try {
      console.log('Initializing player...')
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('No authenticated user found')
        this.playerId = 'anonymous'
        console.log('Player initialized as anonymous')
        return
      }

      this.playerId = user.id

      // Try to load player data (gracefully handle missing records)
      try {
        await this.loadPlayerData()
      } catch (error) {
        console.warn('Could not load player data from database:', error.message)
        // Continue with default values - the game should still work
      }

      console.log('Player initialized:', this.name)

    } catch (error) {
      console.error('Error initializing player:', error)
      // Don't throw - let the game continue with default player data
      this.playerId = 'anonymous'
      console.log('Player initialized with defaults due to error')
    }
  }

  async loadPlayerData() {
    if (!this.playerId || this.playerId === 'anonymous') {
      console.log('No player ID, skipping data load')
      return
    }

    try {
      // Try to load character data
      const { data: character, error } = await supabase
        .from(TABLES.CHARACTERS)
        .select('*')
        .eq('player_id', this.playerId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No character data found in database, using defaults')
        } else {
          console.warn('Character data load error:', error)
        }
        return // Use default values
      }

      // Apply character data if found
      if (character) {
        this.name = character.name || this.name
        this.level = character.level || this.level
        this.experience = character.experience || this.experience
        this.health = character.health || this.health
        this.maxHealth = character.max_health || this.maxHealth
        this.mana = character.mana || this.mana
        this.maxMana = character.max_mana || this.maxMana
        this.x = character.x || this.x
        this.y = character.y || this.y
        
        console.log('Player data loaded from database:', {
          name: this.name,
          level: this.level,
          position: `(${this.x}, ${this.y})`
        })
      }

    } catch (error) {
      console.error('Error loading player data:', error)
      // Continue with default values - don't fail the initialization
    }
  }

  // Set world reference
  setWorld(world) {
    this.world = world
  }

  // Tool usage
  equipTool(toolItem) {
    this.currentTool = toolItem
    console.log('Equipped tool:', toolItem.name)
  }

  async useToolAt(x, y) {
    if (!this.currentTool) {
      console.log('No tool equipped!')
      return { success: false, message: 'No tool equipped' }
    }

    const currentTime = Date.now()
    if (currentTime - this.lastToolUse < this.toolCooldown) {
      return { success: false, message: 'Tool on cooldown' }
    }

    // Check if we're close enough to the target
    const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2)
    if (distance > 64) { // 2 tiles range
      return { success: false, message: 'Too far away' }
    }

    if (!this.world) {
      return { success: false, message: 'World not available' }
    }

    // Find what we're trying to interact with
    let targetObject = null
    let isResourceNode = false

    // Check resource nodes first
    const resourceNode = this.world.getResourceNodeAt(x, y)
    if (resourceNode) {
      targetObject = resourceNode
      isResourceNode = true
    } else {
      // Check world objects (trees, rocks)
      const worldObject = this.world.getObjectAt(x, y)
      if (worldObject) {
        targetObject = worldObject
      }
    }

    if (!targetObject) {
      return { success: false, message: 'Nothing to gather here' }
    }

    // Determine if tool is appropriate for target
    const toolType = this.currentTool.stats?.gathering_type
    let canGather = false

    if (targetObject.type === 'tree' && toolType === 'woodcutting') {
      canGather = true
    } else if (targetObject.type === 'mining' && toolType === 'mining') {
      canGather = true
    } else if (targetObject.type === 'fishing' && toolType === 'fishing') {
      canGather = true
    }

    if (!canGather) {
      return { 
        success: false, 
        message: `Wrong tool! Need ${this.getRequiredToolType(targetObject)} tool` 
      }
    }

    this.lastToolUse = currentTime
    this.isUsingTool = true

    try {
      let result
      
      if (isResourceNode) {
        // Use database function for resource nodes
        result = await this.world.harvestResource(targetObject.id, this.playerId)
      } else {
        // Handle world objects (trees) locally for now
        result = await this.gatherFromWorldObject(targetObject)
      }

      // Add tool use animation
      this.playToolAnimation()
      
      return result

    } catch (error) {
      console.error('Error using tool:', error)
      return { success: false, message: 'Failed to use tool' }
    } finally {
      setTimeout(() => {
        this.isUsingTool = false
      }, 500) // Animation duration
    }
  }

  async gatherFromWorldObject(worldObject) {
    // For now, just give some resources for trees
    if (worldObject.type === 'tree') {
      const yield_amount = 1 + Math.floor(Math.random() * 3) // 1-3 logs
      
      // TODO: Add to player inventory
      // TODO: Add experience
      
      return {
        success: true,
        resource: 'logs',
        quantity: yield_amount,
        message: `Chopped ${yield_amount} logs from tree`,
        experience: 15
      }
    }

    return { success: false, message: 'Cannot gather from this object' }
  }

  getRequiredToolType(targetObject) {
    if (targetObject.type === 'tree') return 'woodcutting'
    if (targetObject.type === 'mining') return 'mining'
    if (targetObject.type === 'fishing') return 'fishing'
    return 'unknown'
  }

  playToolAnimation() {
    // Simple tool use animation (could be enhanced)
    console.log(`🔨 ${this.name} uses ${this.currentTool.name}`)
  }

  // Handle hotbar item usage
  useHotbarItem(item, slotIndex) {
    if (!item) return

    switch (item.type) {
      case 'tool':
        this.equipTool(item)
        console.log(`Equipped ${item.name} - click near objects to gather!`)
        break
        
      case 'consumable':
        this.consumeItem(item)
        break
        
      case 'weapon':
        this.equipWeapon(item)
        break
        
      default:
        console.log(`Using ${item.name}`)
    }
  }

  consumeItem(item) {
    // Simple healing for food items
    if (item.subtype === 'food') {
      const healAmount = 20 // TODO: Make this item-specific
      this.health = Math.min(this.maxHealth, this.health + healAmount)
      console.log(`Ate ${item.name}, healed ${healAmount} HP`)
      
      // TODO: Remove item from inventory
      // TODO: Update UI
    }
  }

  equipWeapon(item) {
    console.log(`Equipped ${item.name}`)
    // TODO: Implement weapon system
  }

  // Interaction method for right-clicks
  async interact(x, y) {
    if (this.currentTool) {
      return await this.useToolAt(x, y)
    } else {
      // Default interaction without tool
      console.log('Right-clicked, but no tool equipped')
      return { success: false, message: 'Equip a tool first' }
    }
  }

  // Movement
  moveTo(x, y) {
    // Check world bounds
    if (this.world) {
      const bounds = this.world.clampToBounds(x, y)
      x = bounds.x
      y = bounds.y
    }

    this.targetX = x
    this.targetY = y
    this.isMoving = true
  }

  setMovementKey(key, pressed) {
    this.movementKeys[key] = pressed
  }

  update(deltaTime) {
    this.updateMovement(deltaTime)
    this.updateAnimation(deltaTime)
  }

  updateMovement(deltaTime) {
    // Keyboard movement
    let moveX = 0
    let moveY = 0
    
    if (this.movementKeys.w) moveY -= 1
    if (this.movementKeys.s) moveY += 1
    if (this.movementKeys.a) moveX -= 1
    if (this.movementKeys.d) moveX += 1
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707 // sqrt(2)/2
      moveY *= 0.707
    }
    
    if (moveX !== 0 || moveY !== 0) {
      const moveDistance = this.speed * deltaTime
      let newX = this.x + moveX * moveDistance
      let newY = this.y + moveY * moveDistance
      
      // Check collision with world bounds and objects
      if (this.world) {
        if (!this.world.isCollisionAt(newX, newY, this.width, this.height)) {
          this.x = newX
          this.y = newY
          this.targetX = this.x
          this.targetY = this.y
          this.isMoving = true
          
          // Update direction
          if (Math.abs(moveX) > Math.abs(moveY)) {
            this.direction = moveX > 0 ? 'right' : 'left'
          } else {
            this.direction = moveY > 0 ? 'down' : 'up'
          }
        }
      } else {
        this.x = newX
        this.y = newY
        this.targetX = this.x
        this.targetY = this.y
        this.isMoving = true
      }
    } else {
      // Mouse movement
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const moveDistance = this.speed * deltaTime
        const normalizedX = dx / distance
        const normalizedY = dy / distance
        
        let newX = this.x + normalizedX * moveDistance
        let newY = this.y + normalizedY * moveDistance
        
        // Check collision
        if (this.world && this.world.isCollisionAt(newX, newY, this.width, this.height)) {
          this.isMoving = false
          return
        }
        
        this.x = newX
        this.y = newY
        this.isMoving = true
        
        // Update direction
        if (Math.abs(dx) > Math.abs(dy)) {
          this.direction = dx > 0 ? 'right' : 'left'
        } else {
          this.direction = dy > 0 ? 'down' : 'up'
        }
      } else {
        this.isMoving = false
      }
    }
  }

  updateAnimation(deltaTime) {
    const currentTime = performance.now()
    
    if (this.isMoving && currentTime - this.lastAnimUpdate > 1000 / this.animSpeed) {
      this.animFrame = (this.animFrame + 1) % 4
      this.lastAnimUpdate = currentTime
    } else if (!this.isMoving) {
      this.animFrame = 0
    }
  }

  processTick(tick) {
    // Process any tick-based updates
  }

  // Rendering
  render(ctx, camera) {
    if (!camera.isInView(this.x, this.y, 50)) return

    const screenPos = camera.worldToScreen(this.x, this.y)
    
    // Player body (simple rectangle for now)
    ctx.fillStyle = '#ffaa00'
    ctx.fillRect(screenPos.x - this.width/2, screenPos.y - this.height + 16, this.width, this.height)
    
    // Player outline
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(screenPos.x - this.width/2, screenPos.y - this.height + 16, this.width, this.height)
    
    // Direction indicator
    this.renderDirectionIndicator(ctx, screenPos)
    
    // Health bar
    this.renderHealthBar(ctx, screenPos)
    
    // Tool use animation
    if (this.isUsingTool) {
      this.renderToolAnimation(ctx, screenPos)
    }
  }

  renderDirectionIndicator(ctx, screenPos) {
    const size = 8
    ctx.fillStyle = '#ff0000'
    
    switch (this.direction) {
      case 'up':
        ctx.fillRect(screenPos.x - size/2, screenPos.y - this.height + 8, size, size)
        break
      case 'down':
        ctx.fillRect(screenPos.x - size/2, screenPos.y + 8, size, size)
        break
      case 'left':
        ctx.fillRect(screenPos.x - this.width/2 + 4, screenPos.y - size/2, size, size)
        break
      case 'right':
        ctx.fillRect(screenPos.x + this.width/2 - 12, screenPos.y - size/2, size, size)
        break
    }
  }

  renderHealthBar(ctx, screenPos) {
    const barWidth = 40
    const barHeight = 4
    const barX = screenPos.x - barWidth/2
    const barY = screenPos.y - this.height - 8
    
    // Background
    ctx.fillStyle = '#333'
    ctx.fillRect(barX, barY, barWidth, barHeight)
    
    // Health bar
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)
    
    // Border
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }

  renderToolAnimation(ctx, screenPos) {
    if (!this.currentTool) return
    
    // Simple tool swing animation
    ctx.save()
    ctx.translate(screenPos.x, screenPos.y)
    
    // Tool icon/effect
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(-4, -this.height/2, 8, 2)
    
    ctx.restore()
  }

  // Network data for multiplayer
  getNetworkData() {
    return {
      x: this.x,
      y: this.y,
      direction: this.direction,
      health: this.health,
      mana: this.mana,
      isMoving: this.isMoving,
      isUsingTool: this.isUsingTool
    }
  }

  // Utility methods
  attack() {
    console.log('Player attacks!')
  }

  targetNearest() {
    console.log('Target nearest enemy')
  }
} 