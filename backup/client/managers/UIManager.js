import { supabase, TABLES } from '../config/supabase.js'

export class UIManager {
  constructor() {
    this.authModal = null
    this.gameElements = null
    this.isInventoryOpen = false
    this.isDragging = false
    this.draggedItem = null
    this.draggedFromSlot = null
    this.hotbarItems = new Array(8).fill(null) // 8 hotbar slots
    this.inventoryItems = new Array(32).fill(null) // 32 inventory slots
    this.onSendChatMessage = null
    this.onUseHotbarItem = null // Callback for when hotbar item is used
    this.setupEventListeners()
    this.cacheElements()
  }

  cacheElements() {
    this.elements = {
      authModal: document.getElementById('authModal'),
      gameCanvas: document.getElementById('gameCanvas'),
      uiOverlay: document.getElementById('ui-overlay'),
      inventoryPanel: document.getElementById('inventory-panel'),
      inventoryBtn: document.getElementById('inventory-btn'),
      inventoryGrid: document.getElementById('inventory-grid'),
      menuBtn: document.getElementById('menu-btn'),
      chatWindow: document.getElementById('chat-window'),
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      healthBar: document.getElementById('health-bar'),
      healthText: document.getElementById('health-text'),
      manaBar: document.getElementById('mana-bar'),
      manaText: document.getElementById('mana-text'),
      hotbar: document.getElementById('hotbar'),
      hotbarSlots: document.querySelectorAll('.hotbar-slot')
    }
  }

  setupEventListeners() {
    // Inventory toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
      this.toggleInventory()
      }
      
      // Hotbar keys
      if (e.key && ['q', 'w', 'e', 'r', '1', '2', '3', '4'].includes(e.key.toLowerCase())) {
        this.handleHotbarKeyPress(e.key.toLowerCase())
      }
    })

    // Chat input
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.elements.chatInput === document.activeElement) {
        this.sendChatMessage()
        } else {
          this.elements.chatInput.focus()
        }
      }
      
      if (e.key === 'Escape') {
        this.elements.chatInput.blur()
        this.hideInventory()
      }
    })

    // Setup button event listeners
    this.setupButtonEventListeners()

    // Setup drag and drop after DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      this.setupDragAndDrop()
      this.setupButtonEventListeners() // Re-setup in case DOM wasn't ready
    })
  }

  setupButtonEventListeners() {
    // Inventory button
    const inventoryBtn = document.getElementById('inventory-btn')
    if (inventoryBtn) {
      inventoryBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.toggleInventory()
      })
    }

    // Menu button
    const menuBtn = document.getElementById('menu-btn')
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.toggleMenu()
      })
    }

    // Inventory panel close button
    const closeBtn = document.querySelector('#inventory-panel .close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.hideInventory()
      })
    }
  }

  setupDragAndDrop() {
    // Set up hotbar drag and drop
    this.elements.hotbarSlots.forEach((slot, index) => {
      slot.addEventListener('dragstart', (e) => this.handleDragStart(e, 'hotbar', index))
      slot.addEventListener('dragover', (e) => this.handleDragOver(e))
      slot.addEventListener('drop', (e) => this.handleDrop(e, 'hotbar', index))
      slot.addEventListener('click', (e) => this.handleHotbarClick(e, index))
      
      // Only make slots draggable when they have items
      this.updateSlotDragability(slot, index, 'hotbar')
    })

    // Set up inventory drag and drop when inventory is created
    this.setupInventoryDragAndDrop()
  }

  updateSlotDragability(slot, index, containerType) {
    const items = containerType === 'hotbar' ? this.hotbarItems : this.inventoryItems
    const hasItem = items[index] !== null
    
    if (hasItem) {
      slot.setAttribute('draggable', 'true')
    } else {
      slot.setAttribute('draggable', 'false')
    }
  }

  setupInventoryDragAndDrop() {
    // This will be called after inventory grid is generated
    const inventorySlots = document.querySelectorAll('.inventory-slot')
    inventorySlots.forEach((slot, index) => {
      slot.addEventListener('dragstart', (e) => this.handleDragStart(e, 'inventory', index))
      slot.addEventListener('dragover', (e) => this.handleDragOver(e))
      slot.addEventListener('drop', (e) => this.handleDrop(e, 'inventory', index))
      
      slot.setAttribute('draggable', 'true')
    })
  }

  handleDragStart(e, containerType, slotIndex) {
    const items = containerType === 'hotbar' ? this.hotbarItems : this.inventoryItems
    const item = items[slotIndex]
    
    if (!item) {
      e.preventDefault()
      return
    }

    this.isDragging = true
    this.draggedItem = item
    this.draggedFromSlot = { container: containerType, index: slotIndex }
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({
      item: item,
      from: containerType,
      index: slotIndex
    }))
  }

  handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  handleDrop(e, containerType, slotIndex) {
    e.preventDefault()
    
    if (!this.isDragging || !this.draggedItem) return

    const targetItems = containerType === 'hotbar' ? this.hotbarItems : this.inventoryItems
    const sourceItems = this.draggedFromSlot.container === 'hotbar' ? this.hotbarItems : this.inventoryItems
    
    // Swap items
    const targetItem = targetItems[slotIndex]
    targetItems[slotIndex] = this.draggedItem
    sourceItems[this.draggedFromSlot.index] = targetItem

    // Update UI
    this.updateHotbarDisplay()
    this.updateInventoryDisplay()

    // Save to database
    this.saveHotbarToDatabase()

    this.clearDragState()
  }

  handleHotbarClick(e, slotIndex) {
    // Only prevent default if we're actually handling the click
    const item = this.hotbarItems[slotIndex]
    
    if (item && this.onUseHotbarItem) {
      e.preventDefault()
      e.stopPropagation()
      this.onUseHotbarItem(item, slotIndex)
    }
    // Don't prevent default if there's no item - let the event bubble up
  }

  handleHotbarKeyPress(key) {
    const keyMap = {
      'q': 0, 'w': 1, 'e': 2, 'r': 3,
      '1': 4, '2': 5, '3': 6, '4': 7
    }
    
    const slotIndex = keyMap[key]
    if (slotIndex !== undefined) {
      this.handleHotbarClick(new Event('click'), slotIndex)
    }
  }

  clearDragState() {
    this.isDragging = false
    this.draggedItem = null
    this.draggedFromSlot = null
  }

  async loadPlayerInventory(playerId) {
    try {
      // Load inventory
      const { data: inventory, error: invError } = await supabase
        .from(TABLES.INVENTORY)
        .select(`
          slot_index,
          quantity,
          items (
            id,
            name,
            type,
            subtype,
            stats,
            max_stack
          )
        `)
        .eq('player_id', playerId)
        .order('slot_index')

      if (invError) throw invError

      // Reset inventory
      this.inventoryItems.fill(null)

      // Populate inventory
      inventory?.forEach(invItem => {
        if (invItem.slot_index >= 0 && invItem.slot_index < 32) {
          this.inventoryItems[invItem.slot_index] = {
            ...invItem.items,
            quantity: invItem.quantity
          }
        }
      })

      // Load hotbar
      const { data: hotbar, error: hotbarError } = await supabase
        .from('hotbar_slots')
        .select(`
          slot_index,
          quantity,
          items (
            id,
            name,
            type,
            subtype,
            stats,
            max_stack
          )
        `)
        .eq('player_id', playerId)
        .order('slot_index')

      if (hotbarError && hotbarError.code !== 'PGRST116') { // Ignore table doesn't exist error
        console.warn('Could not load hotbar:', hotbarError)
      }

      // Reset hotbar
      this.hotbarItems.fill(null)

      // Populate hotbar
      hotbar?.forEach(hotbarItem => {
        if (hotbarItem.slot_index >= 0 && hotbarItem.slot_index < 8) {
          this.hotbarItems[hotbarItem.slot_index] = {
            ...hotbarItem.items,
            quantity: hotbarItem.quantity
          }
        }
      })

      this.updateHotbarDisplay()
      this.updateInventoryDisplay()

      console.log('Player inventory and hotbar loaded')

    } catch (error) {
      console.error('Error loading player inventory:', error)
    }
  }

  async saveHotbarToDatabase() {
    try {
      // Get current player ID from auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Clear existing hotbar
      await supabase
        .from('hotbar_slots')
        .delete()
        .eq('player_id', user.id)

      // Insert current hotbar items
      const hotbarData = this.hotbarItems
        .map((item, index) => item ? {
          player_id: user.id,
          slot_index: index,
          item_id: item.id,
          quantity: item.quantity || 1
        } : null)
        .filter(item => item !== null)

      if (hotbarData.length > 0) {
        const { error } = await supabase
          .from('hotbar_slots')
          .insert(hotbarData)

        if (error) throw error
      }

    } catch (error) {
      console.error('Error saving hotbar:', error)
    }
  }

  updateHotbarDisplay() {
    this.elements.hotbarSlots.forEach((slot, index) => {
      const item = this.hotbarItems[index]
      
      if (item) {
        slot.innerHTML = `
          <div class="item-icon" title="${item.name}">
            <span class="item-name">${item.name.substring(0, 2)}</span>
            ${item.quantity > 1 ? `<span class="item-quantity">${item.quantity}</span>` : ''}
          </div>
        `
        slot.classList.add('has-item')
        
        // Add tool-specific styling
        if (item.type === 'tool') {
          slot.classList.add('tool-item')
        }
      } else {
        const keyMap = ['Q', 'W', 'E', 'R', '1', '2', '3', '4']
        slot.innerHTML = keyMap[index]
        slot.classList.remove('has-item', 'tool-item')
      }
      
      // Update drag state - only draggable when has item
      this.updateSlotDragability(slot, index, 'hotbar')
    })
  }

  updateInventoryDisplay() {
    const inventoryGrid = this.elements.inventoryGrid
    if (!inventoryGrid) return

    inventoryGrid.innerHTML = ''

    for (let i = 0; i < 32; i++) {
      const slot = document.createElement('div')
      slot.className = 'inventory-slot'
      slot.setAttribute('draggable', 'true')
      
      const item = this.inventoryItems[i]
      if (item) {
        slot.innerHTML = `
          <div class="item-icon" title="${item.name}">
            <span class="item-name">${item.name}</span>
            ${item.quantity > 1 ? `<span class="item-quantity">${item.quantity}</span>` : ''}
          </div>
        `
        slot.classList.add('has-item')
      }
      
      inventoryGrid.appendChild(slot)
    }

    // Reattach drag and drop listeners
    this.setupInventoryDragAndDrop()
  }

  // Auth Modal Methods
  showAuthModal() {
    this.elements.authModal?.classList.remove('hidden')
    this.elements.authModal?.style.setProperty('display', 'flex')
  }

  hideAuthModal() {
    this.elements.authModal?.classList.add('hidden')
    this.elements.authModal?.style.setProperty('display', 'none')
  }

  // Game Visibility Methods
  showGame() {
    console.log('Showing game UI...')
    
    // Show canvas and UI overlay
    if (this.elements.gameCanvas) {
      this.elements.gameCanvas.style.display = 'block'
    }
    
    if (this.elements.uiOverlay) {
      this.elements.uiOverlay.style.display = 'block'
    }
    
    // Hide auth modal
    this.hideAuthModal()
    
    // Hide loading screen if it exists
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      loadingScreen.classList.add('hidden')
    }
    
    console.log('Game UI shown successfully')
  }

  hideGame() {
    console.log('Hiding game UI...')
    
    if (this.elements.gameCanvas) {
      this.elements.gameCanvas.style.display = 'none'
    }
    
    if (this.elements.uiOverlay) {
      this.elements.uiOverlay.style.display = 'none'
    }
  }

  // Inventory Methods
  toggleInventory() {
    if (this.isInventoryOpen) {
      this.hideInventory()
    } else {
      this.showInventory()
    }
  }

  showInventory() {
    if (this.elements.inventoryPanel) {
      this.elements.inventoryPanel.classList.remove('hidden')
    this.isInventoryOpen = true
    }
  }

  hideInventory() {
    if (this.elements.inventoryPanel) {
      this.elements.inventoryPanel.classList.add('hidden')
    this.isInventoryOpen = false
    }
  }

  handleInventorySlotClick(slotIndex) {
    console.log('Inventory slot clicked:', slotIndex)
    // TODO: Handle inventory slot interactions
  }

  handleInventorySlotDrop(slotIndex, event) {
    console.log('Item dropped on slot:', slotIndex)
    // TODO: Handle drag and drop inventory interactions
  }

  updateInventorySlot(slotIndex, item) {
    const slot = this.elements.inventoryGrid?.children[slotIndex]
    if (!slot) return

    if (item) {
      slot.classList.add('occupied')
      slot.title = `${item.name} (${item.quantity || 1})`
      // TODO: Add item icon/sprite
      slot.innerHTML = `<div class="item-icon" style="background: #666; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white;">${item.name.charAt(0).toUpperCase()}</div>`
    } else {
      slot.classList.remove('occupied')
      slot.title = ''
      slot.innerHTML = ''
    }
  }

  // Menu Methods
  toggleMenu() {
    // TODO: Implement menu system
    console.log('Menu toggled')
  }

  closeAllPanels() {
    this.hideInventory()
    // TODO: Close other panels when implemented
  }

  // Status Bar Methods
  updateHealthBar(current, max) {
    if (!this.elements.healthBar || !this.elements.healthText) return

    const percentage = Math.max(0, Math.min(100, (current / max) * 100))
    this.elements.healthBar.style.width = `${percentage}%`
    this.elements.healthText.textContent = `${current}/${max}`
  }

  updateManaBar(current, max) {
    if (!this.elements.manaBar || !this.elements.manaText) return

    const percentage = Math.max(0, Math.min(100, (current / max) * 100))
    this.elements.manaBar.style.width = `${percentage}%`
    this.elements.manaText.textContent = `${current}/${max}`
  }

  // Hotbar Methods
  handleHotbarInput(event) {
    const key = event.key.toLowerCase()
    const hotbarKeys = ['q', 'w', 'e', 'r', '1', '2', '3', '4']
    
    if (hotbarKeys.includes(key)) {
      const index = hotbarKeys.indexOf(key)
      this.activateHotbarSlot(index)
      console.log('Hotbar slot activated:', index)
    }
  }

  activateHotbarSlot(index) {
    // Remove active class from all slots
    this.elements.hotbarSlots?.forEach(slot => {
      slot.classList.remove('active')
    })

    // Add active class to selected slot
    const targetSlot = this.elements.hotbarSlots?.[index]
    if (targetSlot) {
      targetSlot.classList.add('active')
      // TODO: Use item/ability in hotbar slot
    }
  }

  updateHotbarSlot(index, item) {
    const slot = this.elements.hotbarSlots?.[index]
    if (!slot) return

    if (item) {
      slot.title = item.name
      // TODO: Add item icon/sprite
      slot.innerHTML = `<div class="hotbar-item">${item.name.charAt(0).toUpperCase()}</div>`
    } else {
      slot.title = `Slot ${index + 1}`
      slot.innerHTML = slot.dataset.key
    }
  }

  // Chat Methods
  sendChatMessage() {
    const message = this.elements.chatInput?.value.trim()
    if (!message) return

    console.log('Sending chat message:', message)
    
    // Clear input
    if (this.elements.chatInput) {
      this.elements.chatInput.value = ''
    }

    // Send message via NetworkManager callback
    if (this.onSendChatMessage) {
      this.onSendChatMessage(message)
    }
    
    // Add to local chat (will also receive via network for consistency)
    this.addChatMessage('You', message, 'self')
  }

  addChatMessage(sender, message, type = 'normal') {
    if (!this.elements.chatMessages) return

    const messageElement = document.createElement('div')
    messageElement.className = `chat-message ${type}`
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    messageElement.innerHTML = `
      <span class="chat-time">[${timestamp}]</span>
      <span class="chat-sender">${sender}:</span>
      <span class="chat-text">${message}</span>
    `

    this.elements.chatMessages.appendChild(messageElement)
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight

    // Limit chat history to 100 messages
    while (this.elements.chatMessages.children.length > 100) {
      this.elements.chatMessages.removeChild(this.elements.chatMessages.firstChild)
    }
  }

  // Notification Methods
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
      color: white;
      padding: 12px 20px;
      border-radius: 5px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `
    notification.textContent = message
    document.body.appendChild(notification)

    // Auto remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s'
        setTimeout(() => {
          notification.parentNode?.removeChild(notification)
        }, 300)
      }
    }, duration)
  }

  // Utility Methods
  setCanvasSize(width, height) {
    if (this.elements.gameCanvas) {
      this.elements.gameCanvas.width = width
      this.elements.gameCanvas.height = height
    }
  }

  getCanvasSize() {
    if (this.elements.gameCanvas) {
      return {
        width: this.elements.gameCanvas.width,
        height: this.elements.gameCanvas.height
      }
    }
    return { width: 1024, height: 768 }
  }
} 