export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this.keys = new Map()
    this.mouse = {
      x: 0,
      y: 0,
      buttons: new Map(),
      isDown: false
    }

    // Callbacks
    this.onMouseClick = null
    this.onMouseMove = null
    this.onMouseWheel = null
    this.onKeyDown = null
    this.onKeyUp = null

    this.init()
  }

  init() {
    this.setupMouseEvents()
    this.setupKeyboardEvents()
    this.setupTouchEvents() // For mobile support
  }

  setupMouseEvents() {
    // Mouse move
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      
      this.mouse.x = (e.clientX - rect.left) * scaleX
      this.mouse.y = (e.clientY - rect.top) * scaleY

      if (this.onMouseMove) {
        this.onMouseMove(this.mouse.x, this.mouse.y)
      }
    })

    // Mouse down
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.mouse.buttons.set(e.button, true)
      this.mouse.isDown = true
    })

    // Mouse up
    this.canvas.addEventListener('mouseup', (e) => {
      e.preventDefault()
      this.mouse.buttons.set(e.button, false)
      this.mouse.isDown = false
    })

    // Mouse click
    this.canvas.addEventListener('click', (e) => {
      e.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      if (this.onMouseClick) {
        this.onMouseClick(x, y, e.button)
      }
    })

    // Context menu (right click)
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      if (this.onMouseClick) {
        this.onMouseClick(x, y, 2) // Right click
      }
    })

    // Mouse wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      
      if (this.onMouseWheel) {
        this.onMouseWheel(e.deltaY)
      }
    })
  }

  setupKeyboardEvents() {
    // Key down
    document.addEventListener('keydown', (e) => {
      // Don't capture input if user is typing in an input field
      if (this.isInputActive()) return

      const key = e.key.toLowerCase()
      
      if (!this.keys.get(key)) {
        this.keys.set(key, true)
        
        if (this.onKeyDown) {
          this.onKeyDown(key, e)
        }
      }

      // Prevent default for game keys
      if (this.isGameKey(key)) {
        e.preventDefault()
      }
    })

    // Key up
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase()
      this.keys.set(key, false)
      
      if (this.onKeyUp) {
        this.onKeyUp(key, e)
      }

      // Prevent default for game keys
      if (this.isGameKey(key)) {
        e.preventDefault()
      }
    })
  }

  setupTouchEvents() {
    // Touch start
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      
      const x = (touch.clientX - rect.left) * scaleX
      const y = (touch.clientY - rect.top) * scaleY

      this.mouse.x = x
      this.mouse.y = y
      this.mouse.isDown = true

      if (this.onMouseClick) {
        this.onMouseClick(x, y, 0) // Treat as left click
      }
    })

    // Touch move
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      
      this.mouse.x = (touch.clientX - rect.left) * scaleX
      this.mouse.y = (touch.clientY - rect.top) * scaleY

      if (this.onMouseMove) {
        this.onMouseMove(this.mouse.x, this.mouse.y)
      }
    })

    // Touch end
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      this.mouse.isDown = false
    })
  }

  // Utility methods
  isKeyPressed(key) {
    return this.keys.get(key.toLowerCase()) || false
  }

  isMouseButtonPressed(button) {
    return this.mouse.buttons.get(button) || false
  }

  getMousePosition() {
    return { x: this.mouse.x, y: this.mouse.y }
  }

  getMouseWorldPosition(camera) {
    if (!camera) return this.getMousePosition()
    return camera.screenToWorld(this.mouse.x, this.mouse.y)
  }

  isInputActive() {
    const activeElement = document.activeElement
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )
  }

  isGameKey(key) {
    const gameKeys = [
      'w', 'a', 's', 'd', // Movement
      'q', 'e', 'r', // Abilities
      '1', '2', '3', '4', // Hotbar
      'space', 'tab', 'shift', 'ctrl', 'alt', // Actions
      'escape' // Menu
    ]
    return gameKeys.includes(key)
  }

  // Movement helpers
  getMovementVector() {
    let x = 0
    let y = 0

    if (this.isKeyPressed('a')) x -= 1
    if (this.isKeyPressed('d')) x += 1
    if (this.isKeyPressed('w')) y -= 1
    if (this.isKeyPressed('s')) y += 1

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y)
      x /= length
      y /= length
    }

    return { x, y }
  }

  isMovementKey(key) {
    return ['w', 'a', 's', 'd'].includes(key.toLowerCase())
  }

  // Update method (called from game loop)
  update(deltaTime) {
    // Update any time-based input logic here
    // For example, handling held keys with repeat rates
  }

  // Cleanup
  destroy() {
    // Remove all event listeners
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler)
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler)
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler)
    this.canvas.removeEventListener('click', this.clickHandler)
    this.canvas.removeEventListener('contextmenu', this.contextMenuHandler)
    this.canvas.removeEventListener('wheel', this.wheelHandler)
    this.canvas.removeEventListener('touchstart', this.touchStartHandler)
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler)
    this.canvas.removeEventListener('touchend', this.touchEndHandler)
    
    document.removeEventListener('keydown', this.keyDownHandler)
    document.removeEventListener('keyup', this.keyUpHandler)

    console.log('InputManager destroyed')
  }

  // Debugging
  debugInfo() {
    const pressedKeys = Array.from(this.keys.entries())
      .filter(([key, pressed]) => pressed)
      .map(([key]) => key)

    return {
      mouse: this.mouse,
      pressedKeys,
      movementVector: this.getMovementVector()
    }
  }
} 