import { supabase, TABLES } from '../config/supabase.js'

export class World {
  constructor() {
    // World dimensions
    this.width = 2048
    this.height = 1536
    this.tileSize = 32
    this.tilesX = Math.ceil(this.width / this.tileSize)
    this.tilesY = Math.ceil(this.height / this.tileSize)
    
    // Tiles
    this.tiles = []
    this.tileTypes = {
      GRASS: 0,
      STONE: 1,
      WATER: 2,
      TREE: 3,
      ROCK: 4
    }
    
    // World objects (trees, rocks, etc.) - loaded from database
    this.objects = []
    this.resourceNodes = []
    
    // Enemies (client-side only for now)
    this.enemies = []
    
    // Background pattern
    this.backgroundPattern = null
    
    // Network manager reference (set by Game.js)
    this.networkManager = null
    
    // Last respawn check
    this.lastRespawnCheck = 0
    this.respawnCheckInterval = 5000 // Check every 5 seconds
  }

  async init() {
    try {
      console.log('Initializing world...')
      
      this.generateTiles()
      await this.loadWorldObjectsFromDatabase()
      await this.loadResourceNodesFromDatabase()
      this.generateEnemies() // Still client-side
      
      console.log(`World initialized: ${this.tilesX}x${this.tilesY} tiles`)
      console.log(`Loaded ${this.objects.length} world objects and ${this.resourceNodes.length} resource nodes from database`)
      
    } catch (error) {
      console.error('Error initializing world:', error)
      // Fallback to local generation if database fails
      console.log('Falling back to local world generation...')
      this.generateObjects()
      this.generateResourceNodes()
      this.generateEnemies()
    }
  }

  // Set network manager reference
  setNetworkManager(networkManager) {
    this.networkManager = networkManager
  }

  generateTiles() {
    // Initialize tile array
    this.tiles = []
    
    for (let y = 0; y < this.tilesY; y++) {
      this.tiles[y] = []
      for (let x = 0; x < this.tilesX; x++) {
        // Simple procedural generation
        let tileType = this.tileTypes.GRASS
        
        // Add some variety
        const random = Math.random()
        const distanceFromCenter = Math.sqrt(
          Math.pow((x - this.tilesX / 2), 2) + 
          Math.pow((y - this.tilesY / 2), 2)
        )
        
        // Water around edges
        if (distanceFromCenter > this.tilesX * 0.4) {
          if (random < 0.6) {
            tileType = this.tileTypes.WATER
          }
        }
        // Stone patches
        else if (random < 0.1) {
          tileType = this.tileTypes.STONE
        }
        
        this.tiles[y][x] = {
          type: tileType,
          x: x * this.tileSize,
          y: y * this.tileSize,
          solid: tileType === this.tileTypes.WATER || tileType === this.tileTypes.ROCK
        }
      }
    }
  }

  async loadWorldObjectsFromDatabase() {
    try {
      const { data: worldObjects, error } = await supabase
        .from(TABLES.WORLD_OBJECTS)
        .select('*')
        .eq('type', 'structure')
        .order('object_id')

      if (error) throw error

      this.objects = worldObjects.map(obj => ({
        id: obj.object_id,
        type: obj.subtype, // 'tree' or 'rock'
        x: obj.x,
        y: obj.y,
        width: obj.data?.width || 32,
        height: obj.data?.height || 48,
        solid: obj.data?.solid || true
      }))

      console.log(`Loaded ${this.objects.length} world objects from database`)

    } catch (error) {
      console.error('Error loading world objects from database:', error)
      throw error
    }
  }

  async loadResourceNodesFromDatabase() {
    try {
      const { data: resourceNodes, error } = await supabase
        .from(TABLES.WORLD_OBJECTS)
        .select('*')
        .eq('type', 'resource_node')
        .order('object_id')

      if (error) throw error

      this.resourceNodes = resourceNodes.map(node => ({
        id: node.object_id,
        type: node.subtype, // 'mining' or 'fishing'
        resource: node.data?.resource || 'unknown',
        x: node.x,
        y: node.y,
        width: node.data?.width || 32,
        height: node.data?.height || 32,
        respawnTime: (node.respawn_time || 30) * 1000, // Convert to milliseconds
        lastHarvested: node.last_interaction ? new Date(node.last_interaction).getTime() : 0,
        isAvailable: node.is_available,
        yield: node.data?.yield || 1
      }))

      console.log(`Loaded ${this.resourceNodes.length} resource nodes from database`)

    } catch (error) {
      console.error('Error loading resource nodes from database:', error)
      throw error
    }
  }

  // Fallback methods for local generation (if database fails)
  generateObjects() {
    this.objects = []
    
    // Generate random trees and rocks
    const numObjects = 100
    
    for (let i = 0; i < numObjects; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      
      // Check if position is on grass
      const tile = this.getTileAt(x, y)
      if (tile && tile.type === this.tileTypes.GRASS) {
        const objectType = Math.random() < 0.7 ? 'tree' : 'rock'
        
        this.objects.push({
          id: `obj_${i}`,
          type: objectType,
          x: x,
          y: y,
          width: 32,
          height: 48,
          solid: true
        })
      }
    }
    
    console.log(`Generated ${this.objects.length} world objects locally`)
  }

  generateResourceNodes() {
    this.resourceNodes = []
    
    // Generate mining nodes
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      
      const tile = this.getTileAt(x, y)
      if (tile && tile.type === this.tileTypes.STONE) {
        this.resourceNodes.push({
          id: `mine_${i}`,
          type: 'mining',
          resource: 'iron_ore',
          x: x,
          y: y,
          width: 32,
          height: 32,
          respawnTime: 30000, // 30 seconds
          lastHarvested: 0,
          isAvailable: true,
          yield: 1
        })
      }
    }
    
    // Generate fishing spots
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      
      const tile = this.getTileAt(x, y)
      if (tile && tile.type === this.tileTypes.WATER) {
        this.resourceNodes.push({
          id: `fish_${i}`,
          type: 'fishing',
          resource: 'fish',
          x: x,
          y: y,
          width: 32,
          height: 32,
          respawnTime: 10000, // 10 seconds
          lastHarvested: 0,
          isAvailable: true,
          yield: 1
        })
      }
    }
    
    console.log(`Generated ${this.resourceNodes.length} resource nodes locally`)
  }

  generateEnemies() {
    this.enemies = []
    
    // Generate basic enemies randomly across the world
    const numEnemies = 25
    
    for (let i = 0; i < numEnemies; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      
      // Check if position is on grass (avoid water/obstacles)
      const tile = this.getTileAt(x, y)
      if (tile && tile.type === this.tileTypes.GRASS) {
        const enemyTypes = ['goblin', 'orc', 'skeleton', 'spider']
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
        
        this.enemies.push({
          id: `enemy_${i}`,
          type: enemyType,
          x: x,
          y: y,
          targetX: x,
          targetY: y,
          width: 32,
          height: 48,
          speed: 50 + Math.random() * 30, // 50-80 pixels per second
          health: 50 + Math.floor(Math.random() * 50), // 50-100 health
          maxHealth: 100,
          level: 1 + Math.floor(Math.random() * 5), // Level 1-5
          direction: 'down',
          lastMoveTime: 0,
          isAlive: true,
          wanderRadius: 200, // How far they wander from spawn
          spawnX: x,
          spawnY: y
        })
      }
    }
    
    console.log(`Generated ${this.enemies.length} enemies`)
  }

  update(deltaTime) {
    this.updateEnemies(deltaTime)
    this.checkResourceRespawns(deltaTime)
  }

  async checkResourceRespawns(deltaTime) {
    const currentTime = Date.now()
    
    // Only check respawns every 5 seconds to reduce database load
    if (currentTime - this.lastRespawnCheck < this.respawnCheckInterval) {
      return
    }
    
    this.lastRespawnCheck = currentTime
    
    try {
      // Call database function to respawn nodes
      const { data, error } = await supabase.rpc('respawn_resource_nodes')
      
      if (error) {
        console.error('Error checking resource respawns:', error)
        return
      }
      
      if (data > 0) {
        console.log(`${data} resource nodes respawned`)
        // Reload resource nodes to get updated state
        await this.loadResourceNodesFromDatabase()
        
        // Broadcast respawn event to other players
        if (this.networkManager) {
          this.networkManager.sendWorldEvent('resource_respawn', { count: data })
        }
      }
      
    } catch (error) {
      console.error('Error in resource respawn check:', error)
    }
  }

  // Method to harvest a resource node
  async harvestResource(nodeId, playerId) {
    try {
      const { data, error } = await supabase.rpc('harvest_resource_node', {
        node_object_id: nodeId,
        player_id: playerId
      })
      
      if (error) throw error
      
      const result = data[0]
      
      if (result.success) {
        // Update local state
        const node = this.resourceNodes.find(n => n.id === nodeId)
        if (node) {
          node.isAvailable = false
          node.lastHarvested = Date.now()
        }
        
        // Broadcast harvest event to other players
        if (this.networkManager) {
          this.networkManager.sendWorldEvent('resource_harvested', {
            nodeId: nodeId,
            playerId: playerId,
            resource: result.resource_item,
            quantity: result.quantity
          })
        }
        
        console.log(result.message)
        return {
          success: true,
          resource: result.resource_item,
          quantity: result.quantity,
          message: result.message
        }
      } else {
        console.log(result.message)
        return {
          success: false,
          message: result.message
        }
      }
      
    } catch (error) {
      console.error('Error harvesting resource:', error)
      return {
        success: false,
        message: 'Failed to harvest resource'
      }
    }
  }

  // Handle world events from other players
  handleWorldEvent(eventType, eventData, playerId) {
    switch (eventType) {
      case 'resource_harvested':
        this.handleResourceHarvested(eventData)
        break
      case 'resource_respawn':
        console.log(`Resources respawned: ${eventData.count}`)
        break
    }
  }

  handleResourceHarvested(eventData) {
    const node = this.resourceNodes.find(n => n.id === eventData.nodeId)
    if (node) {
      node.isAvailable = false
      node.lastHarvested = Date.now()
      console.log(`Resource node ${eventData.nodeId} harvested by another player`)
    }
  }

  updateResourceNodes(deltaTime) {
    const currentTime = Date.now()
    
    this.resourceNodes.forEach(node => {
      if (!node.isAvailable && currentTime - node.lastHarvested >= node.respawnTime) {
        node.isAvailable = true
        console.log(`Resource node ${node.id} respawned`)
      }
    })
  }

  updateEnemies(deltaTime) {
    const currentTime = Date.now()
    
    this.enemies.forEach(enemy => {
      if (!enemy.isAlive) return
      
      // Simple AI: wander around randomly
      if (currentTime - enemy.lastMoveTime > 2000) { // Move every 2 seconds
        const wanderX = enemy.spawnX + (Math.random() - 0.5) * enemy.wanderRadius * 2
        const wanderY = enemy.spawnY + (Math.random() - 0.5) * enemy.wanderRadius * 2
        
        // Clamp to world bounds
        enemy.targetX = Math.max(0, Math.min(this.width, wanderX))
        enemy.targetY = Math.max(0, Math.min(this.height, wanderY))
        enemy.lastMoveTime = currentTime
      }
      
      // Move towards target
      const dx = enemy.targetX - enemy.x
      const dy = enemy.targetY - enemy.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const moveDistance = enemy.speed * deltaTime
        enemy.x += (dx / distance) * moveDistance
        enemy.y += (dy / distance) * moveDistance
        
        // Update direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
          enemy.direction = dx > 0 ? 'right' : 'left'
        } else {
          enemy.direction = dy > 0 ? 'down' : 'up'
        }
      }
    })
  }

  processTick(tick) {
    // Process world events every tick
    // This could include respawning, world events, etc.
  }

  render(ctx, camera) {
    const viewBounds = camera.getViewBounds()
    
    // Calculate which tiles are visible
    const startTileX = Math.max(0, Math.floor(viewBounds.left / this.tileSize))
    const endTileX = Math.min(this.tilesX - 1, Math.ceil(viewBounds.right / this.tileSize))
    const startTileY = Math.max(0, Math.floor(viewBounds.top / this.tileSize))
    const endTileY = Math.min(this.tilesY - 1, Math.ceil(viewBounds.bottom / this.tileSize))
    
    // Render tiles
    this.renderTiles(ctx, startTileX, endTileX, startTileY, endTileY)
    
    // Render objects
    this.renderObjects(ctx, camera)
    
    // Render resource nodes
    this.renderResourceNodes(ctx, camera)
    
    // Render enemies
    this.renderEnemies(ctx, camera)
  }

  renderTiles(ctx, startX, endX, startY, endY) {
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (this.tiles[y] && this.tiles[y][x]) {
          const tile = this.tiles[y][x]
          this.renderTile(ctx, tile)
        }
      }
    }
  }

  renderTile(ctx, tile) {
    let color = '#4a4a4a' // Default
    
    switch (tile.type) {
      case this.tileTypes.GRASS:
        color = '#2d5a2d'
        break
      case this.tileTypes.STONE:
        color = '#666666'
        break
      case this.tileTypes.WATER:
        color = '#1e3d59'
        break
    }
    
    ctx.fillStyle = color
    ctx.fillRect(tile.x, tile.y, this.tileSize, this.tileSize)
    
    // Add tile border for visibility
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(tile.x, tile.y, this.tileSize, this.tileSize)
  }

  renderObjects(ctx, camera) {
    this.objects.forEach(obj => {
      if (camera.isRectInView(obj.x, obj.y, obj.width, obj.height)) {
        this.renderObject(ctx, obj)
      }
    })
  }

  renderObject(ctx, obj) {
    let color = '#8B4513' // Default brown
    
    switch (obj.type) {
      case 'tree':
        // Tree trunk
        ctx.fillStyle = '#8B4513'
        ctx.fillRect(obj.x + 8, obj.y + 16, 16, 32)
        
        // Tree foliage
        ctx.fillStyle = '#228B22'
        ctx.beginPath()
        ctx.arc(obj.x + 16, obj.y + 20, 20, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'rock':
        ctx.fillStyle = '#708090'
        ctx.fillRect(obj.x, obj.y + 16, obj.width, obj.height - 16)
        
        // Add some detail
        ctx.fillStyle = '#556B2F'
        ctx.fillRect(obj.x + 4, obj.y + 20, 8, 8)
        ctx.fillRect(obj.x + 20, obj.y + 32, 6, 6)
        break
    }
  }

  renderResourceNodes(ctx, camera) {
    this.resourceNodes.forEach(node => {
      if (camera.isRectInView(node.x, node.y, node.width, node.height)) {
        this.renderResourceNode(ctx, node)
      }
    })
  }

  renderResourceNode(ctx, node) {
    if (!node.isAvailable) return // Don't render if depleted
    
    let color = '#FFD700' // Gold default
    
    switch (node.type) {
      case 'mining':
        color = '#C0C0C0' // Silver for ore
        break
      case 'fishing':
        color = '#4169E1' // Blue for fishing spots
        break
    }
    
    // Resource node indicator
    ctx.fillStyle = color
    ctx.fillRect(node.x, node.y, node.width, node.height)
    
    // Glowing effect
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(node.x - 2, node.y - 2, node.width + 4, node.height + 4)
  }

  renderEnemies(ctx, camera) {
    this.enemies.forEach(enemy => {
      if (enemy.isAlive && camera.isRectInView(enemy.x, enemy.y, enemy.width, enemy.height)) {
        this.renderEnemy(ctx, enemy)
      }
    })
  }

  renderEnemy(ctx, enemy) {
    // Enemy body color based on type
    let color = '#ff4444' // Default red
    
    switch (enemy.type) {
      case 'goblin':
        color = '#00aa00' // Green
        break
      case 'orc':
        color = '#8B4513' // Brown
        break
      case 'skeleton':
        color = '#dddddd' // Light gray
        break
      case 'spider':
        color = '#330033' // Dark purple
        break
    }
    
    // Enemy body (simple rectangle for now)
    ctx.fillStyle = color
    ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height + 16, enemy.width, enemy.height)
    
    // Enemy outline
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(enemy.x - enemy.width/2, enemy.y - enemy.height + 16, enemy.width, enemy.height)
    
    // Health bar
    const healthPercent = enemy.health / enemy.maxHealth
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(enemy.x - 20, enemy.y - enemy.height, 40 * healthPercent, 4)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(enemy.x - 20, enemy.y - enemy.height, 40, 4)
    
    // Level indicator
    ctx.fillStyle = '#fff'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`L${enemy.level}`, enemy.x, enemy.y - enemy.height - 8)
    ctx.textAlign = 'left'
  }

  // Utility methods
  getTileAt(x, y) {
    const tileX = Math.floor(x / this.tileSize)
    const tileY = Math.floor(y / this.tileSize)
    
    if (tileX >= 0 && tileX < this.tilesX && tileY >= 0 && tileY < this.tilesY) {
      return this.tiles[tileY][tileX]
    }
    
    return null
  }

  getObjectAt(x, y) {
    return this.objects.find(obj => 
      x >= obj.x && x <= obj.x + obj.width &&
      y >= obj.y && y <= obj.y + obj.height
    )
  }

  getResourceNodeAt(x, y) {
    return this.resourceNodes.find(node => 
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height &&
      node.isAvailable
    )
  }

  isCollisionAt(x, y, width = 32, height = 32) {
    // Check tile collision
    const tiles = this.getTilesInArea(x, y, width, height)
    for (let tile of tiles) {
      if (tile && tile.solid) {
        return true
      }
    }
    
    // Check object collision
    const objects = this.getObjectsInArea(x, y, width, height)
    for (let obj of objects) {
      if (obj.solid) {
        return true
      }
    }
    
    return false
  }

  getTilesInArea(x, y, width, height) {
    const tiles = []
    const startTileX = Math.floor(x / this.tileSize)
    const endTileX = Math.floor((x + width) / this.tileSize)
    const startTileY = Math.floor(y / this.tileSize)
    const endTileY = Math.floor((y + height) / this.tileSize)
    
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const tile = this.getTileAt(tx * this.tileSize, ty * this.tileSize)
        if (tile) tiles.push(tile)
      }
    }
    
    return tiles
  }

  getObjectsInArea(x, y, width, height) {
    return this.objects.filter(obj => 
      x < obj.x + obj.width &&
      x + width > obj.x &&
      y < obj.y + obj.height &&
      y + height > obj.y
    )
  }

  // Legacy method for backwards compatibility
  harvestResourceLegacy(nodeId) {
    const node = this.resourceNodes.find(n => n.id === nodeId)
    if (node && node.isAvailable) {
      node.isAvailable = false
      node.lastHarvested = Date.now()
      
      console.log(`Harvested ${node.resource} from ${nodeId} (legacy mode)`)
      return node.resource
    }
    return null
  }

  // World bounds
  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  clampToBounds(x, y) {
    return {
      x: Math.max(0, Math.min(this.width, x)),
      y: Math.max(0, Math.min(this.height, y))
    }
  }

  // Debug methods
  getDebugInfo() {
    return {
      dimensions: { width: this.width, height: this.height },
      tiles: { x: this.tilesX, y: this.tilesY, size: this.tileSize },
      objects: this.objects.length,
      resourceNodes: this.resourceNodes.length,
      availableResources: this.resourceNodes.filter(n => n.isAvailable).length,
      enemies: this.enemies.length,
      aliveEnemies: this.enemies.filter(e => e.isAlive).length
    }
  }

  // Save/load methods (for future persistence)
  serialize() {
    return {
      objects: this.objects,
      resourceNodes: this.resourceNodes.map(node => ({
        ...node,
        // Don't save timing data
        lastHarvested: 0,
        isAvailable: true
      })),
      enemies: this.enemies.map(enemy => ({
        ...enemy,
        lastMoveTime: 0, // Reset for save
        isAlive: true // Assume alive for save
      }))
    }
  }

  deserialize(data) {
    if (data.objects) {
      this.objects = data.objects
    }
    if (data.resourceNodes) {
      this.resourceNodes = data.resourceNodes
    }
    if (data.enemies) {
      this.enemies = data.enemies
    }
  }

  // Getter methods for game systems
  getEnemies() {
    return this.enemies.filter(enemy => enemy.isAlive)
  }

  getEnemyAt(x, y) {
    return this.enemies.find(enemy => 
      enemy.isAlive &&
      x >= enemy.x - enemy.width/2 && x <= enemy.x + enemy.width/2 &&
      y >= enemy.y - enemy.height + 16 && y <= enemy.y + 16
    )
  }
} 