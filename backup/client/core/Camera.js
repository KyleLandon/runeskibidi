export class Camera {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.x = 0
    this.y = 0
    this.scale = 1.0
    this.targetScale = 1.0
    
    // Camera movement
    this.target = null
    this.followSpeed = 5.0
    this.smoothing = true
    
    // Bounds
    this.bounds = {
      left: -Infinity,
      right: Infinity,
      top: -Infinity,
      bottom: Infinity
    }
    
    // Shake effect
    this.shake = {
      intensity: 0,
      duration: 0,
      offsetX: 0,
      offsetY: 0
    }

    // Zoom constraints
    this.minZoom = 0.5
    this.maxZoom = 3.0
    this.zoomSpeed = 0.1
  }

  setTarget(target) {
    this.target = target
    if (target) {
      this.x = target.x
      this.y = target.y
    }
  }

  setBounds(left, top, right, bottom) {
    this.bounds.left = left
    this.bounds.top = top
    this.bounds.right = right
    this.bounds.bottom = bottom
  }

  update(deltaTime) {
    this.updateFollow(deltaTime)
    this.updateZoom(deltaTime)
    this.updateShake(deltaTime)
    this.applyBounds()
  }

  updateFollow(deltaTime) {
    if (!this.target) return

    const targetX = this.target.x
    const targetY = this.target.y

    if (this.smoothing) {
      // Smooth camera following
      const lerp = Math.min(1.0, this.followSpeed * deltaTime)
      this.x += (targetX - this.x) * lerp
      this.y += (targetY - this.y) * lerp
    } else {
      // Instant following
      this.x = targetX
      this.y = targetY
    }
  }

  updateZoom(deltaTime) {
    if (Math.abs(this.scale - this.targetScale) > 0.01) {
      const lerp = Math.min(1.0, this.zoomSpeed * 10 * deltaTime)
      this.scale += (this.targetScale - this.scale) * lerp
    }
  }

  updateShake(deltaTime) {
    if (this.shake.duration > 0) {
      this.shake.duration -= deltaTime

      if (this.shake.duration <= 0) {
        this.shake.intensity = 0
        this.shake.offsetX = 0
        this.shake.offsetY = 0
      } else {
        // Generate random shake offset
        const intensity = this.shake.intensity * (this.shake.duration / this.shake.duration)
        this.shake.offsetX = (Math.random() - 0.5) * intensity * 2
        this.shake.offsetY = (Math.random() - 0.5) * intensity * 2
      }
    }
  }

  applyBounds() {
    const halfWidth = this.width / (2 * this.scale)
    const halfHeight = this.height / (2 * this.scale)

    // Apply bounds if they are set
    if (this.bounds.left > -Infinity) {
      this.x = Math.max(this.bounds.left + halfWidth, this.x)
    }
    if (this.bounds.right < Infinity) {
      this.x = Math.min(this.bounds.right - halfWidth, this.x)
    }
    if (this.bounds.top > -Infinity) {
      this.y = Math.max(this.bounds.top + halfHeight, this.y)
    }
    if (this.bounds.bottom < Infinity) {
      this.y = Math.min(this.bounds.bottom - halfHeight, this.y)
    }
  }

  zoom(delta) {
    this.targetScale += delta
    this.targetScale = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetScale))
  }

  setZoom(zoom) {
    this.targetScale = Math.max(this.minZoom, Math.min(this.maxZoom, zoom))
  }

  startShake(intensity, duration) {
    this.shake.intensity = intensity
    this.shake.duration = duration
  }

  // Transform methods
  applyTransform(ctx) {
    ctx.save()
    
    // Apply camera transform
    ctx.translate(this.width / 2, this.height / 2)
    ctx.scale(this.scale, this.scale)
    ctx.translate(-this.x + this.shake.offsetX, -this.y + this.shake.offsetY)
  }

  removeTransform(ctx) {
    ctx.restore()
  }

  // Coordinate conversion
  worldToScreen(worldX, worldY) {
    const screenX = (worldX - this.x + this.shake.offsetX) * this.scale + this.width / 2
    const screenY = (worldY - this.y + this.shake.offsetY) * this.scale + this.height / 2
    return { x: screenX, y: screenY }
  }

  screenToWorld(screenX, screenY) {
    const worldX = (screenX - this.width / 2) / this.scale + this.x - this.shake.offsetX
    const worldY = (screenY - this.height / 2) / this.scale + this.y - this.shake.offsetY
    return { x: worldX, y: worldY }
  }

  // Viewport queries
  getViewBounds() {
    const halfWidth = this.width / (2 * this.scale)
    const halfHeight = this.height / (2 * this.scale)

    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight
    }
  }

  isInView(x, y, margin = 0) {
    const bounds = this.getViewBounds()
    return x >= bounds.left - margin &&
           x <= bounds.right + margin &&
           y >= bounds.top - margin &&
           y <= bounds.bottom + margin
  }

  isRectInView(x, y, width, height, margin = 0) {
    const bounds = this.getViewBounds()
    return x + width >= bounds.left - margin &&
           x <= bounds.right + margin &&
           y + height >= bounds.top - margin &&
           y <= bounds.bottom + margin
  }

  // Camera movement
  moveTo(x, y) {
    this.x = x
    this.y = y
  }

  moveBy(deltaX, deltaY) {
    this.x += deltaX
    this.y += deltaY
  }

  // Utilities
  resize(width, height) {
    this.width = width
    this.height = height
  }

  reset() {
    this.x = 0
    this.y = 0
    this.scale = 1.0
    this.targetScale = 1.0
    this.shake.intensity = 0
    this.shake.duration = 0
    this.shake.offsetX = 0
    this.shake.offsetY = 0
  }

  // Animation helpers
  panTo(targetX, targetY, duration = 1.0) {
    // TODO: Implement smooth panning animation
    console.log(`Panning to ${targetX}, ${targetY} over ${duration}s`)
  }

  zoomTo(targetZoom, duration = 1.0) {
    // TODO: Implement smooth zoom animation
    this.setZoom(targetZoom)
  }

  // Debug info
  getDebugInfo() {
    return {
      position: { x: this.x, y: this.y },
      scale: this.scale,
      targetScale: this.targetScale,
      bounds: this.bounds,
      shake: this.shake,
      viewBounds: this.getViewBounds()
    }
  }
} 