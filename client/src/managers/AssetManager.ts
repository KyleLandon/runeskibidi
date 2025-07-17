import * as PIXI from 'pixi.js';

export interface PlayerAnimation {
  idle: PIXI.Texture[];
  walk: PIXI.Texture[];
  run?: PIXI.Texture[];
}

export interface TerrainTiles {
  grass: PIXI.Texture[];
  dirt: PIXI.Texture[];
  stone: PIXI.Texture[];
  water: PIXI.Texture[];
}

export interface ObjectSprites {
  rocks: PIXI.Texture[];
  trees: PIXI.Texture[];
  crystals: PIXI.Texture[];
  bushes: PIXI.Texture[];
  houses: PIXI.Texture[];
  fieldTiles: PIXI.Texture[];
  fieldsTileset: PIXI.Texture | null;
}

export interface GameAudio {
  intro1: HTMLAudioElement;
  intro2: HTMLAudioElement;
  login: HTMLAudioElement;
}

export class AssetManager {
  private static instance: AssetManager;
  
  public playerMaleAnimations: PlayerAnimation | null = null;
  public playerFemaleAnimations: PlayerAnimation | null = null;
  public playerWalkingDirections: { down: PIXI.Texture[], left: PIXI.Texture[], right: PIXI.Texture[], up: PIXI.Texture[] } | null = null;
  public terrainTiles: TerrainTiles | null = null;
  public objects: ObjectSprites | null = null;
  public audio: GameAudio | null = null;
  
  private loadingPromise: Promise<void> | null = null;

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  async loadAllAssets(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.performAssetLoading();
    return this.loadingPromise;
  }

  private async performAssetLoading(): Promise<void> {
    console.log('🎮 Loading game assets...');
    
    // Load all assets in parallel for better performance
    await Promise.all([
      this.loadPlayerAnimations(),
      this.loadTerrainTiles(),
      this.loadObjectSprites(),
      this.loadAudio()
    ]);
    
    console.log('✅ All assets loaded successfully!');
  }

  private async loadPlayerAnimations(): Promise<void> {
    console.log('👤 Loading player animations...');
    
    // Let's try a simple approach first - load just the shadow file to test
    console.log('🔍 Testing file access...');
    
    try {
      // Test if we can load the shadow file first
      const shadowTexture = await PIXI.Assets.load('tilesets/PLAYER_MALE_TILESET/Tiled_files/shadow.png');
      console.log('✅ Shadow loaded successfully:', shadowTexture.width, 'x', shadowTexture.height);
      
      // Now try loading the actual character sprites
      const idleTexture = await PIXI.Assets.load('tilesets/PLAYER_MALE_TILESET/Tiled_files/Unarmed_Idle_full.png');
      console.log('✅ Idle sprite loaded:', idleTexture.width, 'x', idleTexture.height);
      
      const walkTexture = await PIXI.Assets.load('tilesets/PLAYER_MALE_TILESET/Tiled_files/Unarmed_Walk_full.png');
      console.log('✅ Walk sprite loaded:', walkTexture.width, 'x', walkTexture.height);
      
      const runTexture = await PIXI.Assets.load('tilesets/PLAYER_MALE_TILESET/Tiled_files/Unarmed_Run_full.png');
      console.log('✅ Run sprite loaded:', runTexture.width, 'x', runTexture.height);
      
      // Debug: Let's see what the actual dimensions are
      console.log('🔍 DEBUG - Texture analysis:');
      console.log('Idle dimensions:', idleTexture.width, 'x', idleTexture.height);
      console.log('Walk dimensions:', walkTexture.width, 'x', walkTexture.height);
      console.log('Run dimensions:', runTexture.width, 'x', runTexture.height);
      
      // Extract single frames for now until we get the layout right
      const idleFrame = this.extractSingleCharacterFrame(idleTexture);
      const walkFrame = this.extractSingleCharacterFrame(walkTexture);
      const runFrame = this.extractSingleCharacterFrame(runTexture);
      
      // For now, just use single frames
      this.playerMaleAnimations = {
        idle: idleFrame ? [idleFrame] : [],
        walk: walkFrame ? [walkFrame] : [],
        run: runFrame ? [runFrame] : []
      };
      
      // Store all directional walking animations for future use (commented out for now)
      // this.playerWalkingDirections = {
      //   down: walkDownFrames,
      //   left: this.extractWalkingFrames(walkTexture, 'left'),
      //   right: this.extractWalkingFrames(walkTexture, 'right'),
      //   up: this.extractWalkingFrames(walkTexture, 'up')
      // };

      console.log('✅ Player animations set up successfully');
    } catch (error) {
      console.error('❌ Failed to load player sprites:', error);
      
      // Fallback to empty arrays (will use graphics fallback)
      this.playerMaleAnimations = {
        idle: [],
        walk: []
      };
    }

    // For now, use male animations for female as well (can be expanded later)
    this.playerFemaleAnimations = this.playerMaleAnimations;
  }

  private extractWalkingFrames(tilesheet: PIXI.Texture, direction: 'down' | 'left' | 'right' | 'up'): PIXI.Texture[] {
    try {
      // The tilesheet is 4x4 (4 columns for animation frames, 4 rows for directions)
      // Row 0: walking down (4 frames)
      // Row 1: walking left (4 frames) 
      // Row 2: walking right (4 frames)
      // Row 3: walking up (4 frames)
      
      const cols = 4;
      const rows = 4;
      const frameWidth = tilesheet.width / cols;
      const frameHeight = tilesheet.height / rows;
      
      console.log(`📐 Sprite sheet analysis: ${cols}x${rows} grid, each frame ${frameWidth}x${frameHeight}`);
      
      // Determine which row to start from based on direction
      let startRow = 0;
      switch (direction) {
        case 'down': startRow = 0; break;
        case 'left': startRow = 1; break;
        case 'right': startRow = 2; break;
        case 'up': startRow = 3; break;
      }
      
      const frames: PIXI.Texture[] = [];
      
      // Extract 4 frames from the specified row
      for (let col = 0; col < cols; col++) {
        const x = col * frameWidth;
        const y = startRow * frameHeight;
        const rect = new PIXI.Rectangle(x, y, frameWidth, frameHeight);
        frames.push(new PIXI.Texture(tilesheet, rect));
      }
      
      console.log(`✂️ Extracted ${frames.length} ${direction} walking frames`);
      return frames;
    } catch (error) {
      console.error('Failed to extract walking frames:', error);
      return [];
    }
  }

  private extractSingleCharacterFrame(tilesheet: PIXI.Texture): PIXI.Texture | null {
    try {
      // For idle animations, just take the first frame (top-left corner)
      // Assume characters are roughly square, try different common sizes
      
      const possibleSizes = [32, 48, 64, 96, 128];
      let frameSize = 64; // default
      
      // Try to guess frame size based on total dimensions
      for (const size of possibleSizes) {
        if (tilesheet.width % size === 0 && tilesheet.height % size === 0) {
          frameSize = size;
          break;
        }
      }
      
      // If that didn't work, use width/12 as a guess (12 columns is common)
      if (tilesheet.width % frameSize !== 0) {
        frameSize = Math.floor(tilesheet.width / 12);
      }
      
      console.log(`🎯 Using frame size ${frameSize}x${frameSize} for idle sprite`);
      
      const rect = new PIXI.Rectangle(0, 0, frameSize, frameSize);
      return new PIXI.Texture(tilesheet, rect);
    } catch (error) {
      console.error('Failed to extract character frame:', error);
    }
    return null;
  }

  private async loadSinglePlayerFrame(imagePath: string): Promise<PIXI.Texture[]> {
    try {
      const texture = await PIXI.Assets.load(imagePath);
      
      // Check if texture loaded properly
      if (!texture || texture.width === 0 || texture.height === 0) {
        console.warn(`Invalid texture loaded: ${imagePath}`);
        return [];
      }
      
      console.log(`✅ Loaded player sprite: ${imagePath} (${texture.width}x${texture.height})`);
      
      // Return the single texture as an array (for AnimatedSprite compatibility)
      return [texture];
    } catch (error) {
      console.warn(`Failed to load player sprite: ${imagePath}`, error);
      return [];
    }
  }

  private async loadAnimationFrames(spritesheetPath: string): Promise<PIXI.Texture[]> {
    try {
      const texture = await PIXI.Assets.load(spritesheetPath);
      
      // Check if texture loaded properly
      if (!texture || texture.width === 0 || texture.height === 0) {
        console.warn(`Invalid texture loaded: ${spritesheetPath}`);
        return [];
      }
      
      console.log(`📊 Analyzing sprite sheet: ${spritesheetPath} (${texture.width}x${texture.height})`);
      
      // For character animations, try to detect the frame layout
      // Character sprites are typically arranged in rows/columns
      // Let's try different common layouts
      
      // Try horizontal layout first (1 row, multiple columns)
      let frameCount = 4; // Start with 4 frames
      let frameWidth = texture.width / frameCount;
      let frameHeight = texture.height;
      
      // If frames would be too wide (indicating it might be a vertical layout or single frame)
      if (frameWidth > texture.height * 2) {
        // Try vertical layout (multiple rows, 1 column)
        frameCount = Math.min(4, Math.floor(texture.height / (texture.width * 0.8))); // Character should be roughly 1:1.2 ratio
        if (frameCount > 1) {
          frameWidth = texture.width;
          frameHeight = texture.height / frameCount;
        } else {
          // Single frame
          frameCount = 1;
          frameWidth = texture.width;
          frameHeight = texture.height;
        }
      }
      
      // Validate frame dimensions
      if (frameWidth <= 0 || frameHeight <= 0) {
        console.warn(`Invalid frame dimensions for: ${spritesheetPath}`);
        return [];
      }
      
      console.log(`🎬 Extracting ${frameCount} frames (${frameWidth}x${frameHeight} each)`);
      
      const frames: PIXI.Texture[] = [];
      
      if (frameCount === 1) {
        // Single frame
        frames.push(texture);
      } else if (frameWidth > frameHeight) {
        // Horizontal layout
        for (let i = 0; i < frameCount; i++) {
          const rect = new PIXI.Rectangle(i * frameWidth, 0, frameWidth, frameHeight);
          frames.push(new PIXI.Texture(texture, rect));
        }
      } else {
        // Vertical layout
        for (let i = 0; i < frameCount; i++) {
          const rect = new PIXI.Rectangle(0, i * frameHeight, frameWidth, frameHeight);
          frames.push(new PIXI.Texture(texture, rect));
        }
      }
      
      return frames;
    } catch (error) {
      console.warn(`Failed to load animation: ${spritesheetPath}`, error);
      return [];
    }
  }

  private async loadTerrainTiles(): Promise<void> {
    console.log('🌱 Loading terrain tiles...');
    
    const grassTiles: PIXI.Texture[] = [];
    const dirtTiles: PIXI.Texture[] = [];
    const stoneTiles: PIXI.Texture[] = [];
    
    // Load various field tiles - grass variations
    const grassTileNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Green grass tiles
    for (const num of grassTileNumbers) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/FIELDS_TILESET/1 Tiles/FieldsTile_${num.toString().padStart(2, '0')}.png`);
        grassTiles.push(texture);
      } catch (error) {
        console.warn(`Failed to load grass tile ${num}`, error);
      }
    }

    // Load dirt/stone tiles
    const dirtTileNumbers = [20, 21, 22, 23, 24, 25]; // Brown/dirt tiles
    for (const num of dirtTileNumbers) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/FIELDS_TILESET/1 Tiles/FieldsTile_${num.toString().padStart(2, '0')}.png`);
        dirtTiles.push(texture);
      } catch (error) {
        console.warn(`Failed to load dirt tile ${num}`, error);
      }
    }

    // Load stone tiles
    const stoneTileNumbers = [40, 41, 42, 43, 44, 45]; // Stone tiles
    for (const num of stoneTileNumbers) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/FIELDS_TILESET/1 Tiles/FieldsTile_${num.toString().padStart(2, '0')}.png`);
        stoneTiles.push(texture);
      } catch (error) {
        console.warn(`Failed to load stone tile ${num}`, error);
      }
    }

    this.terrainTiles = {
      grass: grassTiles,
      dirt: dirtTiles,
      stone: stoneTiles,
      water: [] // No water tiles in this tileset
    };
  }

  private async loadObjectSprites(): Promise<void> {
    console.log('🗿 Loading object sprites...');
    
    const rocks: PIXI.Texture[] = [];
    const crystals: PIXI.Texture[] = [];
    const bushes: PIXI.Texture[] = [];
    const houses: PIXI.Texture[] = [];
    
    // Load various rock types
    const rockVariants = [
      'Rock5_1.png',
      'Rock5_2.png', 
      'Rock5_3.png',
      'Rock6_1.png',
      'Rock6_2.png',
      'Rock7_1.png',
      'Rock8_1.png',
      'Rock8_2.png'
    ];

    for (const rockFile of rockVariants) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/ROCKS_TILESET/PNG/Objects_separately/${rockFile}`);
        rocks.push(texture);
      } catch (error) {
        console.warn(`Failed to load rock: ${rockFile}`, error);
      }
    }

    // Load crystal variants
    const crystalVariants = [
      'Blue_crystal1.png',
      'Blue_crystal2.png',
      'Green_crystal1.png',
      'Green_crystal2.png',
      'Red_crystal1.png',
      'Red_crystal2.png',
      'Violet_crystal1.png',
      'Violet_crystal2.png',
      'Yellow_crystal1.png',
      'Yellow_crystal2.png',
      'Pink_crystal1.png',
      'White_crystal1.png'
    ];

    for (const crystalFile of crystalVariants) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/CRYSTALS_TILELSET/PNG/Assets/${crystalFile}`);
        crystals.push(texture);
      } catch (error) {
        console.warn(`Failed to load crystal: ${crystalFile}`, error);
      }
    }

    // Load bush variants
    const bushVariants = ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png'];

    for (const bushFile of bushVariants) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/FIELDS_TILESET/2 Objects/9 Bush/${bushFile}`);
        bushes.push(texture);
      } catch (error) {
        console.warn(`Failed to load bush: ${bushFile}`, error);
      }
    }

    // Load house variants
    const houseVariants = ['1.png', '2.png', '3.png', '4.png'];

    for (const houseFile of houseVariants) {
      try {
        const texture = await PIXI.Assets.load(`tilesets/VILLAGE_TILESET/2 Objects/7 House/${houseFile}`);
        houses.push(texture);
      } catch (error) {
        console.warn(`Failed to load house: ${houseFile}`, error);
      }
    }

    // Load field tiles from village tileset
    const fieldTiles: PIXI.Texture[] = [];
    let fieldsTileset: PIXI.Texture | null = null;

    // Load the main FieldsTileset.png
    try {
      fieldsTileset = await PIXI.Assets.load('tilesets/VILLAGE_TILESET/1 Tiles/FieldsTileset.png');
    } catch (error) {
      console.warn('Failed to load FieldsTileset.png', error);
    }

    // Load individual field tiles (FieldsTile_01.png to FieldsTile_64.png)
    for (let i = 1; i <= 64; i++) {
      const tileNumber = i.toString().padStart(2, '0');
      try {
        const texture = await PIXI.Assets.load(`tilesets/VILLAGE_TILESET/1 Tiles/FieldsTile_${tileNumber}.png`);
        fieldTiles.push(texture);
      } catch (error) {
        console.warn(`Failed to load FieldsTile_${tileNumber}.png`, error);
      }
    }

    this.objects = {
      rocks,
      crystals,
      bushes,
      houses,
      fieldTiles,
      fieldsTileset,
      trees: [] // Trees will be loaded from a different tileset if available
    };

    console.log(`✅ Loaded ${rocks.length} rocks, ${crystals.length} crystals, ${bushes.length} bushes, ${houses.length} houses, ${fieldTiles.length} field tiles`);
  }

  private async loadAudio(): Promise<void> {
    console.log('🎵 Loading audio assets...');
    
    try {
      const intro1 = new Audio('music/intro_1.mp3');
      const intro2 = new Audio('music/intro_2.mp3');
      const login = new Audio('music/login_1.mp3');

      // Preload audio
      await Promise.all([
        new Promise(resolve => {
          intro1.addEventListener('canplaythrough', resolve, { once: true });
          intro1.load();
        }),
        new Promise(resolve => {
          intro2.addEventListener('canplaythrough', resolve, { once: true });
          intro2.load();
        }),
        new Promise(resolve => {
          login.addEventListener('canplaythrough', resolve, { once: true });
          login.load();
        })
      ]);

      this.audio = { intro1, intro2, login };
    } catch (error) {
      console.warn('Failed to load audio assets', error);
      this.audio = null;
    }
  }

  // Helper methods to get random variations
  getRandomGrassTile(): PIXI.Texture | null {
    if (!this.terrainTiles?.grass.length) return null;
    return this.terrainTiles.grass[Math.floor(Math.random() * this.terrainTiles.grass.length)];
  }

  getRandomRockSprite(): PIXI.Texture | null {
    if (!this.objects?.rocks.length) return null;
    return this.objects.rocks[Math.floor(Math.random() * this.objects.rocks.length)];
  }

  getRandomCrystalSprite(): PIXI.Texture | null {
    if (!this.objects?.crystals.length) return null;
    return this.objects.crystals[Math.floor(Math.random() * this.objects.crystals.length)];
  }

  getRandomBushSprite(): PIXI.Texture | null {
    if (!this.objects?.bushes.length) return null;
    return this.objects.bushes[Math.floor(Math.random() * this.objects.bushes.length)];
  }

  getRandomHouseSprite(): PIXI.Texture | null {
    if (!this.objects?.houses.length) return null;
    return this.objects.houses[Math.floor(Math.random() * this.objects.houses.length)];
  }

  getPlayerAnimation(gender: 'male' | 'female', animation: 'idle' | 'walk'): PIXI.Texture[] {
    const animations = gender === 'male' ? this.playerMaleAnimations : this.playerFemaleAnimations;
    return animations?.[animation] || [];
  }

  playMusic(track: 'intro1' | 'intro2' | 'login', loop: boolean = true) {
    if (!this.audio) return;
    
    const audio = this.audio[track];
    audio.loop = loop;
    audio.volume = 0.3; // Set reasonable volume
    audio.play().catch(error => {
      console.warn(`Failed to play ${track}:`, error);
    });
  }

  stopAllMusic() {
    if (!this.audio) return;
    
    Object.values(this.audio).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  getRandomFieldTile(): PIXI.Texture | null {
    if (!this.objects?.fieldTiles.length) return null;
    return this.objects.fieldTiles[Math.floor(Math.random() * this.objects.fieldTiles.length)];
  }

  getFieldsTileset(): PIXI.Texture | null {
    return this.objects?.fieldsTileset || null;
  }
} 