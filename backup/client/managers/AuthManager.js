import { supabase } from '../config/supabase.js'

const TABLES = {
  PLAYERS: 'players',
  CHARACTERS: 'characters',
  PLAYER_SKILLS: 'player_skills',
  SKILLS: 'skills'
}

const LOADING_TIPS = [
  'Tip: Use WASD to move around the world!',
  'Tip: Press I to open your inventory!',
  'Tip: Click and drag items to move them!',
  'Tip: Talk to NPCs to learn about the world!',
  'Tip: Collect resources to craft better equipment!',
  'Tip: Your health and mana regenerate over time!',
  'Tip: Different tools are better for different tasks!',
  'Tip: Watch out for dangerous creatures at night!'
]

export class AuthManager {
  constructor(uiManager = null) {
    this.currentUser = null
    this.playerData = null
    this.uiManager = uiManager // Reference to UIManager
    this.loadingTipInterval = null
    this.setupEventListeners()
    this.checkAuthState()
  }

  setupEventListeners() {
    // Use a small delay to ensure DOM elements are ready
    setTimeout(() => {
      // Login form
      const loginForm = document.getElementById('loginForm')
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault()
          const formData = new FormData(loginForm)
          await this.handleLogin(loginForm, formData.get('email'), formData.get('password'))
        })
      }

      // Register form
      const registerForm = document.getElementById('registerForm')
      if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
          e.preventDefault()
          const formData = new FormData(registerForm)
          await this.handleRegister(registerForm, formData.get('email'), formData.get('password'), formData.get('username'))
        })
      }

      // Tab switching
      const loginTab = document.getElementById('loginTab')
      const registerTab = document.getElementById('registerTab')
      const loginContent = document.getElementById('loginContent')
      const registerContent = document.getElementById('registerContent')

      if (loginTab && registerTab && loginContent && registerContent) {
        loginTab.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          loginTab.classList.add('active')
          registerTab.classList.remove('active')
          loginContent.classList.add('active')
          registerContent.classList.remove('active')
        })

        registerTab.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          registerTab.classList.add('active')
          loginTab.classList.remove('active')
          registerContent.classList.add('active')
          loginContent.classList.remove('active')
        })
      } else {
        console.error('Auth tab elements not found!', {
          loginTab,
          registerTab,
          loginContent,
          registerContent
        })
      }
    }, 100)

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout())
    }
  }

  async checkAuthState() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Auth check error:', error)
        return
      }

      if (user) {
        this.currentUser = user
        // Show loading screen for existing sessions
        this.showLoadingScreen()
        this.updateLoadingStep('step-auth', 'completed')
        this.updateLoadingProgress(25, 'Session restored!')
        await this.loadPlayerData(user)
        this.showGame()
      } else {
        this.showAuth()
      }
    } catch (error) {
      console.error('Auth state check failed:', error)
      this.showAuth()
    }
  }

  async handleLogin(form, email, password) {
    if (!email || !password) {
      this.showFormError(form, 'Please fill in all fields')
      return
    }

    this.setFormLoading(form, true)

    try {
      // Show loading screen and hide auth modal
      this.showLoadingScreen()
      const authModal = document.getElementById('authModal')
      if (authModal) {
        authModal.classList.add('hidden')
        authModal.style.display = 'none'
      }

      // Start authentication step
      this.updateLoadingStep('step-auth', 'active')
      this.updateLoadingProgress(10, 'Authenticating...')

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      console.log('Login successful:', data.user.email)
      this.currentUser = data.user
      
      // Complete authentication step
      this.updateLoadingStep('step-auth', 'completed')
      this.updateLoadingProgress(25, 'Authentication successful!')
      
      // Update last login
      await this.updateLastLogin(data.user.id)
      
      // Load player data with progress tracking
      await this.loadPlayerData(data.user)
      
      this.showGame()

    } catch (error) {
      console.error('Login error:', error)
      this.hideLoadingScreen()
      // Show auth modal again on error
      const authModal = document.getElementById('authModal')
      if (authModal) {
        authModal.classList.remove('hidden')
        authModal.style.display = 'flex'
      }
      this.showFormError(form, error.message)
    } finally {
      this.setFormLoading(form, false)
    }
  }

  async handleRegister(form, email, password, username) {
    if (!email || !password || !username) {
      this.showFormError(form, 'Please fill in all fields')
      return
    }

    if (password.length < 6) {
      this.showFormError(form, 'Password must be at least 6 characters long')
      return
    }

    if (username.length < 3) {
      this.showFormError(form, 'Username must be at least 3 characters long')
      return
    }

    this.setFormLoading(form, true)

    try {
      // Show loading screen and hide auth modal
      this.showLoadingScreen()
      const authModal = document.getElementById('authModal')
      if (authModal) {
        authModal.classList.add('hidden')
        authModal.style.display = 'none'
      }

      // Start authentication step
      this.updateLoadingStep('step-auth', 'active')
      this.updateLoadingProgress(10, 'Creating account...')

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) throw error

      console.log('Registration successful:', data.user.email)
      this.currentUser = data.user
      
      // Complete authentication step
      this.updateLoadingStep('step-auth', 'completed')
      this.updateLoadingProgress(25, 'Account created successfully!')
      
      // Load/create player data automatically with progress tracking
      await this.loadPlayerData(data.user)
      
      // Small delay to ensure authentication session is fully established
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      this.showGame()

    } catch (error) {
      console.error('Registration error:', error)
      this.hideLoadingScreen()
      // Show auth modal again on error
      const authModal = document.getElementById('authModal')
      if (authModal) {
        authModal.classList.remove('hidden')
        authModal.style.display = 'flex'
      }
      this.showFormError(form, error.message)
    } finally {
      this.setFormLoading(form, false)
    }
  }



  async updateLastLogin(userId) {
    try {
      await supabase
        .from(TABLES.PLAYERS)
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
    } catch (error) {
      console.warn('Could not update last login:', error.message)
    }
  }

  async loadPlayerData(user) {
    try {
      console.log('Loading player data for user:', user.id)
      
      // Start player data step
      this.updateLoadingStep('step-player', 'active')
      this.updateLoadingProgress(35, 'Loading player profile...')
      
      // Try to load existing player data
      let player = null
      let character = null
      
      try {
        const { data: existingPlayer, error: playerError } = await supabase
          .from(TABLES.PLAYERS)
          .select('*')
          .eq('id', user.id)
          .single()

        if (playerError && playerError.code !== 'PGRST116') {
          throw playerError
        }
        
        player = existingPlayer
      } catch (err) {
        console.log('Player record not found, will create:', err.message)
      }

      // Create player record if it doesn't exist
      if (!player) {
        console.log('Creating missing player record...')
        try {
          const { data: newPlayer, error: createError } = await supabase
            .from(TABLES.PLAYERS)
            .insert({
              id: user.id,
              username: user.user_metadata?.username || `Player${user.id.slice(0, 8)}`,
              email: user.email || '',
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              is_online: true
            })
            .select()
            .single()

          if (createError) {
            console.error('Failed to create player record:', createError)
            throw new Error(`Could not create player profile: ${createError.message}`)
          }
          
          player = newPlayer
          console.log('Player record created successfully:', player.username)
        } catch (err) {
          console.error('Player creation failed:', err)
          // Continue with default player data
          player = {
            id: user.id,
            username: user.user_metadata?.username || `Player${user.id.slice(0, 8)}`,
            email: user.email || '',
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            is_online: true
          }
          console.log('Using fallback player data')
        }
      }

      // Complete player data step
      this.updateLoadingStep('step-player', 'completed')
      this.updateLoadingProgress(50, 'Player profile loaded!')

      // Start character step
      this.updateLoadingStep('step-character', 'active')
      this.updateLoadingProgress(60, 'Preparing character...')

      // Try to load character data
      try {
        const { data: existingCharacter, error: characterError } = await supabase
          .from(TABLES.CHARACTERS)
          .select('*')
          .eq('player_id', user.id)
          .single()

        if (characterError && characterError.code !== 'PGRST116') {
          throw characterError
        }
        
        character = existingCharacter
      } catch (err) {
        console.log('Character record not found, will create:', err.message)
      }

      // Create character if it doesn't exist
      if (!character) {
        console.log('Creating missing character record...')
        try {
          const { data: newCharacter, error: createCharError } = await supabase
            .from(TABLES.CHARACTERS)
            .insert({
              player_id: user.id,
              name: player.username,
              level: 1,
              experience: 0,
              health: 100,
              max_health: 100,
              mana: 50,
              max_mana: 50,
              x: 512,
              y: 384,
              sprite_id: 'player_default'
            })
            .select()
            .single()

          if (createCharError) {
            console.error('Failed to create character:', createCharError)
            throw new Error(`Could not create character: ${createCharError.message}`)
          }
          
          character = newCharacter
          console.log('Character created successfully:', character.name)

          // Give starter items to new characters
          this.updateLoadingProgress(70, 'Equipping starter gear...')
          await this.giveStarterItems(user.id)
        } catch (err) {
          console.error('Character creation failed:', err)
          // Continue with default character data
          character = {
            player_id: user.id,
            name: player.username,
            level: 1,
            experience: 0,
            health: 100,
            max_health: 100,
            mana: 50,
            max_mana: 50,
            x: 512,
            y: 384,
            sprite_id: 'player_default'
          }
          console.log('Using fallback character data')
        }
      }

      // Complete character step
      this.updateLoadingStep('step-character', 'completed')
      this.updateLoadingProgress(80, 'Character ready!')

      // Load player skills (optional - continue even if it fails)
      let skills = []
      try {
        const { data: playerSkills, error: skillsError } = await supabase
          .from(TABLES.PLAYER_SKILLS)
          .select(`
            *,
            skills(name, description, category)
          `)
          .eq('player_id', user.id)

        if (skillsError && skillsError.code !== 'PGRST116') {
          console.warn('Skills loading failed:', skillsError)
        } else {
          skills = playerSkills || []
        }
      } catch (err) {
        console.warn('Could not load skills:', err.message)
      }

      this.playerData = {
        user,
        player,
        character,
        skills
      }

      console.log('Player data loaded successfully:', this.playerData.player.username)

      // Start world connection step
      this.updateLoadingStep('step-world', 'active')
      this.updateLoadingProgress(90, 'Connecting to world...')

      // Update last login
      try {
        await supabase
          .from(TABLES.PLAYERS)
          .update({ 
            last_login: new Date().toISOString(),
            is_online: true 
          })
          .eq('id', user.id)
      } catch (err) {
        console.warn('Could not update last login:', err.message)
      }

      // Complete world connection step
      this.updateLoadingStep('step-world', 'completed')
      this.updateLoadingProgress(100, 'Welcome to Runeskibidi!')

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500))

      // Dispatch event for game initialization
      window.dispatchEvent(new CustomEvent('playerDataLoaded', { 
        detail: this.playerData 
      }))

    } catch (error) {
      this.fallbackMode = true
      this.uiManager?.showNotification('Warning: Using fallback player data!', 'error', 8000)
      console.error('Failed to load player data:', error)
      throw error
    }
  }

  async giveStarterItems(playerId) {
    try {
      console.log('Giving starter items to new player...')
      
      const starterItems = [
        { item_id: 'iron_pickaxe', quantity: 1 },
        { item_id: 'fishing_rod', quantity: 1 },
        { item_id: 'bread', quantity: 5 },
        { item_id: 'wooden_sword', quantity: 1 }
      ]

      for (let i = 0; i < starterItems.length; i++) {
        const item = starterItems[i]
        try {
          await supabase
            .from('inventory')
            .insert({
              player_id: playerId,
              item_id: item.item_id,
              quantity: item.quantity,
              slot_index: i
            })
          console.log(`Added ${item.item_id} to inventory`)
        } catch (err) {
          console.warn(`Could not add ${item.item_id}:`, err.message)
        }
      }
    } catch (error) {
      console.warn('Could not give starter items:', error.message)
    }
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      this.currentUser = null
      this.playerData = null
      
      console.log('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  showAuth() {
    console.log('Showing authentication...')
    if (this.uiManager) {
      this.uiManager.showAuthModal()
      this.uiManager.hideGame()
    } else {
      // Fallback for direct DOM manipulation
      const authModal = document.getElementById('authModal')
      if (authModal) {
        authModal.classList.remove('hidden')
        authModal.style.display = 'flex'
      }
    }
  }

  showGame() {
    console.log('Authentication successful, showing game...')
    this.hideLoadingScreen()
    if (this.uiManager) {
      this.uiManager.hideAuthModal()
      this.uiManager.showGame()
    } else {
      // Fallback for direct DOM manipulation
      const authModal = document.getElementById('authModal')
      if (authModal) {
        authModal.classList.add('hidden')
        authModal.style.display = 'none'
      }
    }
  }

  showLoadingScreen() {
    console.log('Showing loading screen...')
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden')
    }
    
    // Reset progress
    this.updateLoadingProgress(0, 'Initializing...')
    this.resetLoadingSteps()
    
    // Start tip rotation
    this.startTipRotation()
  }

  hideLoadingScreen() {
    console.log('Hiding loading screen...')
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      loadingScreen.classList.add('hidden')
    }
    
    // Stop tip rotation
    this.stopTipRotation()
  }

  updateLoadingProgress(percentage, status = '') {
    const progressFill = document.getElementById('loading-progress-fill')
    const progressStatus = document.getElementById('loading-status')
    const progressPercentage = document.getElementById('loading-percentage')
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`
    }
    
    if (progressStatus && status) {
      progressStatus.textContent = status
    }
    
    if (progressPercentage) {
      progressPercentage.textContent = `${Math.round(percentage)}%`
    }
  }

  updateLoadingStep(stepId, status = 'active') {
    const step = document.getElementById(stepId)
    if (!step) return
    
    // Remove all status classes
    step.classList.remove('active', 'completed')
    
    // Add new status
    if (status === 'active') {
      step.classList.add('active')
    } else if (status === 'completed') {
      step.classList.add('completed')
    }
  }

  resetLoadingSteps() {
    const steps = ['step-auth', 'step-player', 'step-character', 'step-world']
    steps.forEach(stepId => {
      const step = document.getElementById(stepId)
      if (step) {
        step.classList.remove('active', 'completed')
      }
    })
  }

  startTipRotation() {
    let currentTipIndex = 0
    const tipElement = document.getElementById('loading-tip')
    
    if (!tipElement) return
    
    // Show first tip
    tipElement.textContent = LOADING_TIPS[currentTipIndex]
    
    // Rotate tips every 3 seconds
    this.loadingTipInterval = setInterval(() => {
      currentTipIndex = (currentTipIndex + 1) % LOADING_TIPS.length
      tipElement.textContent = LOADING_TIPS[currentTipIndex]
    }, 3000)
  }

  stopTipRotation() {
    if (this.loadingTipInterval) {
      clearInterval(this.loadingTipInterval)
      this.loadingTipInterval = null
    }
  }

  setFormLoading(form, loading) {
    const submitBtn = form.querySelector('button[type="submit"]')
    const inputs = form.querySelectorAll('input')
    
    if (submitBtn) {
      submitBtn.disabled = loading
      submitBtn.textContent = loading ? 'Processing...' : (form.id === 'loginForm' ? 'Login' : 'Register')
    }
    
    inputs.forEach(input => input.disabled = loading)
  }

  showFormError(form, message) {
    // Remove existing error
    const existingError = form.querySelector('.error-message')
    if (existingError) existingError.remove()

    // Add new error
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.style.cssText = 'color: #dc3545; margin-top: 10px; font-size: 14px;'
    errorDiv.textContent = message

    form.appendChild(errorDiv)

    // Remove error after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) errorDiv.remove()
    }, 5000)
  }

  getCurrentUser() {
    return this.currentUser
  }

  getPlayerData() {
    return this.playerData
  }
}