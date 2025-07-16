import { Player } from './Player.js'
import { World } from './World.js'
import { Camera } from './Camera.js'
import { InputManager } from '../managers/InputManager.js'
import { NetworkManager } from '../managers/NetworkManager.js'
import { UIManager } from '../managers/UIManager.js'

export class Game {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.isRunning = false
    this.lastFrameTime = 0
    this.deltaTime = 0
    this.fps = 60
    this.targetFrameTime = 1000 / this.fps

    // Game objects
    this.player = null
    this.world = null
    this.camera = null

    // Managers
    this.inputManager = null
    this.networkManager = null
    this.uiManager = null

    // Game state
    this.gameState = 'loading' // loading, playing, paused
    this.tick = 0
    this.tickRate = 600 // 600ms per tick (classic MMO style)
    this.lastTick = 0

    // Debug
    this.debugMode = false
    this.lastError = null
    this.fallbackMode = false
    this.sessionInfo = null
  }

  async init() {
    try {
      console.log('Initializing game...')

      // Get canvas and context
      this.canvas = document.getElementById('gameCanvas')
      if (!this.canvas) {
        throw new Error('Canvas element not found')
      }

      this.ctx = this.canvas.getContext('2d')
      if (!this.ctx) {
        throw new Error('Could not get 2D context')
      }

      // Set up canvas
      this.setupCanvas()

      // Initialize managers
      this.inputManager = new InputManager(this.canvas)
      this.networkManager = new NetworkManager()
      this.uiManager = new UIManager()

      // Initialize game objects
      this.camera = new Camera(this.canvas.width, this.canvas.height)
      this.world = new World()
      this.player = new Player()

      // Initialize all systems
      await this.initializeSystems()

      // Set initial game state
      this.gameState = 'playing'

      // Start game loop
      this.start()

      // Listen for F3 to toggle debug overlay
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F3') {
          this.debugMode = !this.debugMode
        }
      })

      console.log('Game initialized successfully')

    } catch (error) {
      this.lastError = error
      console.error('Error initializing game:', error)
      throw error
    }
  }

  async initializeSystems() {
    try {
      // Initialize network manager
      await this.networkManager.init()

      // Initialize world
      await this.world.init()

      // Initialize player
      await this.player.init()

      // Set up camera to follow player
      this.camera.setTarget(this.player)

      // Connect world to network manager
      this.world.setNetworkManager(this.networkManager)

      // Connect player to world
      this.player.setWorld(this.world)

      // Set up network manager world event callback
      this.networkManager.onWorldEvent = (eventType, eventData, playerId) => {
        this.world.handleWorldEvent(eventType, eventData, playerId)
      }

      // Set up UI manager callbacks
      this.uiManager.onUseHotbarItem = (item, slotIndex) => {
        this.handleHotbarItemUse(item, slotIndex)
      }

      // Load player inventory and hotbar
      await this.uiManager.loadPlayerInventory(this.player.playerId)

      // Set up input callbacks
      this.setupInputCallbacks()

      console.log('All game systems initialized')

    } catch (error) {
      console.error('Error initializing game systems:', error)
      throw error
    }
  }

  handleHotbarItemUse(item, slotIndex) {
    if (!this.player) return

    console.log(`Using hotbar item: ${item.name} (slot ${slotIndex})`)
    this.player.useHotbarItem(item, slotIndex)
    
    // If it's a tool, show instruction message
    if (item.type === 'tool') {
      this.showMessage(`${item.name} equipped! Right-click near objects to gather.`)
    }
  }

  showMessage(message) {
    // Simple message display - could be enhanced with proper UI
    console.log('📢 ' + message)
    
    // TODO: Display in-game message UI
    // For now, we can add it to chat
    if (this.uiManager) {
      this.uiManager.addChatMessage('System', message, 'system')
    }
  }

  setupCanvas() {
    // Set canvas size
    this.canvas.width = 1024
    this.canvas.height = 768

    // Set up canvas properties
    this.ctx.imageSmoothingEnabled = false // Pixel art style
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'

    // Handle canvas resize
    window.addEventListener('resize', () => {
      this.handleResize()
    })

    this.handleResize()
  }

  handleResize() {
    const container = this.canvas.parentElement
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Maintain aspect ratio
    const aspectRatio = 1024 / 768
    let newWidth = containerWidth
    let newHeight = containerWidth / aspectRatio

    if (newHeight > containerHeight) {
      newHeight = containerHeight
      newWidth = containerHeight * aspectRatio
    }

    // Update canvas display size
    this.canvas.style.width = `${newWidth}px`
    this.canvas.style.height = `${newHeight}px`
  }

  setupInputCallbacks() {
    console.log('Setting up input callbacks...')
    
    // Mouse click for movement and interaction
    this.inputManager.onMouseClick = async (x, y, button) => {
      if (this.gameState !== 'playing') {
        console.log('Game not in playing state, ignoring click')
        return
      }

      // Convert screen coordinates to world coordinates
      const worldPos = this.camera.screenToWorld(x, y)
      
      if (button === 0) { // Left click - movement
        this.player.moveTo(worldPos.x, worldPos.y)
      } else if (button === 2) { // Right click - interaction/tool use
        const result = await this.player.interact(worldPos.x, worldPos.y)
        
        if (result.success) {
          this.showMessage(result.message)
          
          // Handle successful resource gathering
          if (result.resource && result.quantity) {
            this.showResourceGained(result.resource, result.quantity)
            
            // TODO: Add to player inventory
            // TODO: Update UI
          }
        } else if (result.message) {
          this.showMessage(result.message)
        }
      }
    }

    // Keyboard input
    this.inputManager.onKeyDown = (key) => {
      this.handleKeyDown(key)
    }

    this.inputManager.onKeyUp = (key) => {
      this.handleKeyUp(key)
    }

    // Mouse wheel for camera zoom
    this.inputManager.onMouseWheel = (deltaY) => {
      this.camera.zoom(deltaY > 0 ? -0.1 : 0.1)
    }
    
    console.log('Input callbacks set up successfully')
  }

  showResourceGained(resource, quantity) {
    console.log(`🎒 Gained ${quantity}x ${resource}`)
    // TODO: Show floating text animation
    // TODO: Update inventory UI
  }

  handleKeyDown(key) {
    switch (key.toLowerCase()) {
      case 'w':
      case 'a':
      case 's':
      case 'd':
        this.player.setMovementKey(key.toLowerCase(), true)
        break
      case 'space':
        // Example: Attack or interact
        this.player.attack()
        break
      case 'tab':
        // Handled by UIManager
        break
    }
  }

  handleKeyUp(key) {
    switch (key.toLowerCase()) {
      case 'w':
      case 'a':
      case 's':
      case 'd':
        this.player.setMovementKey(key.toLowerCase(), false)
        break
    }
  }

  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.lastTick = Date.now()
    
    this.gameLoop()
    console.log('Game loop started')
  }

  stop() {
    this.isRunning = false
    console.log('Game loop stopped')
  }

  gameLoop() {
    if (!this.isRunning) return

    const currentTime = performance.now()
    this.deltaTime = (currentTime - this.lastFrameTime) / 1000
    this.lastFrameTime = currentTime

    // Process game tick
    this.processTick()

    // Update game systems
    this.update(this.deltaTime)

    // Render everything
    this.render()

    // Schedule next frame
    requestAnimationFrame(() => this.gameLoop())
  }

  processTick() {
    const currentTime = Date.now()
    
    if (currentTime - this.lastTick >= this.tickRate) {
      this.tick++
      this.lastTick = currentTime

      // Process tick-based updates
      this.world.processTick(this.tick)
      this.player.processTick(this.tick)

      // Send network updates
      this.networkManager.sendPlayerUpdate(this.player.getNetworkData())
    }
  }

  update(deltaTime) {
    if (this.gameState !== 'playing') return

    // Update game objects
    this.player.update(deltaTime)
    this.world.update(deltaTime)
    this.camera.update(deltaTime)

    // Update managers
    this.inputManager.update(deltaTime)
    this.networkManager.update(deltaTime)
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.gameState !== 'playing') {
      this.renderLoadingScreen()
      // Fallback: draw a debug rectangle to confirm render loop is running
      this.ctx.save()
      this.ctx.fillStyle = '#222'
      this.ctx.fillRect(10, 10, 100, 40)
      this.ctx.fillStyle = '#fff'
      this.ctx.font = '16px Segoe UI, Arial, sans-serif'
      this.ctx.fillText('Loading...', 20, 35)
      this.ctx.restore()
      return
    }

    // Defensive: check player and camera
    if (!this.player || !this.camera) {
      this.ctx.save()
      this.ctx.fillStyle = 'red'
      this.ctx.fillRect(10, 10, 200, 40)
      this.ctx.fillStyle = '#fff'
      this.ctx.font = '16px Segoe UI, Arial, sans-serif'
      this.ctx.fillText('Error: Player or camera not initialized', 20, 35)
      this.ctx.restore()
      return
    }

    // Set up camera transform
    this.ctx.save()
    this.camera.applyTransform(this.ctx)

    // Render world
    if (this.world) this.world.render(this.ctx, this.camera)

    // Render player
    if (this.player) this.player.render(this.ctx, this.camera)

    // Render other players
    if (this.networkManager) this.networkManager.renderOtherPlayers(this.ctx, this.camera)

    // Restore transform
    this.ctx.restore()

    // Render UI elements (not affected by camera)
    this.renderUI()

    // Render debug info
    if (this.isDebugMode()) {
      this.renderDebugInfo()
    }

    // Render debug overlay if enabled
    if (this.debugMode) {
      this.renderDebugOverlay()
    }
  }

  renderLoadingScreen() {
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '24px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.textAlign = 'left'
  }

  renderUI() {
    // Render minimap
    this.renderMinimap()
    
    // Render player nameplate
    this.renderPlayerNameplate()
  }

  renderMinimap() {
    const minimapSize = 150
    const x = this.canvas.width - minimapSize - 10
    const y = 10

    // Minimap background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(x, y, minimapSize, minimapSize)
    
    this.ctx.strokeStyle = '#666'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, minimapSize, minimapSize)

    // Calculate scale factor for world to minimap coordinates
    const scaleX = minimapSize / this.world.width
    const scaleY = minimapSize / this.world.height

    // Function to convert world coordinates to minimap coordinates
    const worldToMinimap = (worldX, worldY) => {
      return {
        x: x + (worldX * scaleX),
        y: y + (worldY * scaleY)
      }
    }

    // Render enemies as red dots
    if (this.world && this.world.enemies) {
      this.world.enemies.forEach(enemy => {
        if (enemy.isAlive) {
          const enemyPos = worldToMinimap(enemy.x, enemy.y)
          
          this.ctx.fillStyle = '#ff0000' // Red for enemies
          this.ctx.beginPath()
          this.ctx.arc(enemyPos.x, enemyPos.y, 2, 0, Math.PI * 2)
          this.ctx.fill()
        }
      })
    }

    // Render other players as white dots
    if (this.networkManager && this.networkManager.otherPlayers) {
      this.networkManager.otherPlayers.forEach((player) => {
        if (player.isOnline && player.character) {
          const playerPos = worldToMinimap(player.character.x, player.character.y)
          
          this.ctx.fillStyle = '#ffffff' // White for other players
          this.ctx.beginPath()
          this.ctx.arc(playerPos.x, playerPos.y, 2, 0, Math.PI * 2)
          this.ctx.fill()
        }
      })
    }

    // Render current player as yellow dot (larger and on top)
    if (this.player) {
      const playerPos = worldToMinimap(this.player.x, this.player.y)
      
      this.ctx.fillStyle = '#ffaa00' // Yellow for current player
      this.ctx.beginPath()
      this.ctx.arc(playerPos.x, playerPos.y, 3, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Add a white border to make it stand out
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }

    // Add minimap title
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('Minimap', x + minimapSize / 2, y - 5)
    this.ctx.textAlign = 'left'

    // Add legend below minimap
    const legendY = y + minimapSize + 15
    this.ctx.font = '10px monospace'
    
    // Current player legend
    this.ctx.fillStyle = '#ffaa00'
    this.ctx.beginPath()
    this.ctx.arc(x + 8, legendY, 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText('You', x + 15, legendY - 3)
    
    // Other players legend
    this.ctx.fillStyle = '#ffffff'
    this.ctx.beginPath()
    this.ctx.arc(x + 8, legendY + 12, 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.fillText('Players', x + 15, legendY + 9)
    
    // Enemies legend
    this.ctx.fillStyle = '#ff0000'
    this.ctx.beginPath()
    this.ctx.arc(x + 8, legendY + 24, 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText('Enemies', x + 15, legendY + 21)
  }

  renderPlayerNameplate() {
    if (!this.player) return

    const screenPos = this.camera.worldToScreen(this.player.x, this.player.y - 40)
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.fillRect(screenPos.x - 30, screenPos.y - 10, 60, 20)
    
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(this.player.name || 'Player', screenPos.x, screenPos.y - 5)
    this.ctx.textAlign = 'left'
  }

  renderDebugInfo() {
    const info = [
      `FPS: ${Math.round(1 / this.deltaTime)}`,
      `Tick: ${this.tick}`,
      `Player: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
      `Camera: ${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`,
      `Zoom: ${this.camera.scale.toFixed(2)}`,
      `Tool: ${this.player.currentTool?.name || 'None'}`
    ]

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(10, 10, 200, info.length * 16 + 10)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = '12px monospace'
    
    info.forEach((line, index) => {
      this.ctx.fillText(line, 15, 20 + index * 16)
    })
  }

  renderDebugOverlay() {
    this.ctx.save()
    this.ctx.globalAlpha = 0.85
    this.ctx.fillStyle = '#222'
    this.ctx.fillRect(10, 10, 400, 140)
    this.ctx.globalAlpha = 1.0
    this.ctx.fillStyle = '#0ff'
    this.ctx.font = 'bold 16px Segoe UI, Arial, sans-serif'
    this.ctx.fillText('DEBUG OVERLAY (F3)', 20, 32)
    this.ctx.fillStyle = '#fff'
    let y = 55
    this.ctx.font = '14px Segoe UI, Arial, sans-serif'
    this.ctx.fillText('Game State: ' + this.gameState, 20, y); y += 20
    this.ctx.fillText('Player ID: ' + (this.player?.playerId || 'N/A'), 20, y); y += 20
    this.ctx.fillText('Camera: ' + (this.camera ? `${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}` : 'N/A'), 20, y); y += 20
    this.ctx.fillText('Session: ' + (this.sessionInfo || 'N/A'), 20, y); y += 20
    this.ctx.fillText('Fallback Mode: ' + (this.fallbackMode ? 'YES' : 'NO'), 20, y); y += 20
    if (this.lastError) {
      this.ctx.fillStyle = '#f66'
      this.ctx.fillText('Last Error: ' + this.lastError.message, 20, y)
    }
    this.ctx.restore()
  }

  isDebugMode() {
    return localStorage.getItem('debug') === 'true'
  }

  // Game state management
  pause() {
    this.gameState = 'paused'
  }

  resume() {
    this.gameState = 'playing'
  }

  // Cleanup
  destroy() {
    this.stop()
    
    if (this.networkManager) {
      this.networkManager.destroy()
    }
    
    if (this.inputManager) {
      this.inputManager.destroy()
    }

    console.log('Game destroyed')
  }

  // Utility methods
  getMouseWorldPosition() {
    return this.inputManager.getMouseWorldPosition(this.camera)
  }

  spawnEffect(x, y, type) {
    // TODO: Implement visual effects system
    console.log(`Effect ${type} spawned at ${x}, ${y}`)
  }

  playSound(soundName, volume = 1.0) {
    // TODO: Implement audio system
    console.log(`Playing sound: ${soundName} at volume ${volume}`)
  }
} 