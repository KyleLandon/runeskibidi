import * as PIXI from 'pixi.js';
import { Player } from './Player';
import { AssetManager } from '../managers/AssetManager';
import { UIManager } from '../managers/UIManager';
import { HUD } from '../ui/HUD';
import { GPUOptimizer } from './GPUOptimizer';
import { SkillManager, type SkillGain } from '../managers/SkillManager';

export class Game {
  app!: PIXI.Application;
  player!: Player;
  keys: { [key: string]: boolean } = {};
  worldContainer!: PIXI.Container;
  camera!: PIXI.Container;
  cameraZoom: number = 2.0; // Start closer to player (default was effectively 1.0)
  minZoom: number = 1.0; // Maximum zoom out (original distance)
  maxZoom: number = 4.0; // Maximum zoom in
  targetPosition: { x: number; y: number } | null = null;
  moveIndicator!: PIXI.Graphics;
  interactableObjects: PIXI.Container[] = [];
  objectMetadata: Map<PIXI.Container, { type: string; id: string }> = new Map();
  assetManager: AssetManager;
  uiManager!: UIManager;
  hud!: HUD;
  gpuOptimizer!: GPUOptimizer;
  skillManager: SkillManager;
  playerResources = { wood: 0, ore: 0, gems: 0, berries: 0 };
  
  constructor() {
    // Constructor will be set up by the static create method
    this.assetManager = AssetManager.getInstance();
    this.skillManager = SkillManager.getInstance();
  }

  static async create(container: HTMLElement): Promise<Game> {
    const game = new Game();
    
    // Load all assets first
    console.log('🎮 Starting asset loading...');
    await game.assetManager.loadAllAssets();
    
    // Initialize PIXI.js application using the modern v8 API
    game.app = new PIXI.Application();
    
    // Initialize with async init() method as required by PIXI v8
    await game.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x87CEEB, // Sky blue background
      antialias: false, // Disable antialiasing for better performance
      resolution: 1, // Fixed resolution for consistent performance
      autoDensity: false,
      // GPU optimizations
      powerPreference: 'high-performance', // Use dedicated GPU if available
      preferWebGLVersion: 2, // Use WebGL2 for better performance
    });
    
    // Add canvas to container - canvas is now available after init()
    container.appendChild(game.app.canvas);

    // Handle window resize
    window.addEventListener('resize', () => {
      game.app.renderer.resize(window.innerWidth, window.innerHeight);
    });

    // Create camera container for world scrolling
    game.camera = new PIXI.Container();
    game.app.stage.addChild(game.camera);

    // Create world container
    game.worldContainer = new PIXI.Container();
    game.camera.addChild(game.worldContainer);
    
    // Apply initial zoom
    game.camera.scale.set(game.cameraZoom);

    // Initialize GPU Optimizer early
    game.gpuOptimizer = new GPUOptimizer(game.app);
    console.log('🚀 GPU Optimizer initialized');

    // Create world environment with tileset graphics
    game.createWorld();

    // Create player (will be initialized with character data later)
    game.player = new Player(0, 0); // Start at world center
    game.worldContainer.addChild(game.player);

    // Initialize UI Manager
    game.uiManager = new UIManager(game.player);
    console.log('🖥️ UI Manager initialized');

    // Initialize HUD
    game.hud = new HUD();
    console.log('📊 HUD initialized');

    // Load saved skills
    game.skillManager.loadSkills();

    // Create movement indicator
    game.moveIndicator = new PIXI.Graphics();
    game.worldContainer.addChild(game.moveIndicator);

    // Set up mouse interactions
    game.setupMouseInteractions();

    // Start game music
    game.assetManager.playMusic('intro1', true);

    // Configure ticker for optimal performance
    game.app.ticker.maxFPS = 60; // Cap at 60 FPS for consistent performance
    game.app.ticker.minFPS = 30; // Minimum FPS before frame dropping
    
    // Start game loop with performance monitoring
    let frameCount = 0;
    game.app.ticker.add(() => {
      game.update();
      
             // Update performance stats less frequently to reduce CPU overhead
       frameCount++;
       if (frameCount >= 120) { // Every 2 seconds
         const stats = game.gpuOptimizer.getPerformanceStats();
         const memoryMB = stats.memoryUsage / 1024 / 1024;
         
         // Update HUD performance display
         game.hud.updatePerformanceStats(game.app.ticker.FPS, memoryMB);
         frameCount = 0;
       }
    });
    
    return game;
  }

  createWorld() {
    // Create tiled ground using terrain tiles
    this.createTiledGround();

    // Use regular containers for interactive objects (ParticleContainer doesn't support interactions)
    console.log('🌍 Creating world with optimized but interactive objects...');

    // Add trees with GPU optimizations - much fewer for better performance
    for (let i = 0; i < 15; i++) { // Further reduced for 60fps target
      const tree = this.createTree();
      tree.x = (Math.random() - 0.5) * 1200; // Smaller world for denser gameplay
      tree.y = (Math.random() - 0.5) * 1200;
      
      // GPU optimizations
      tree.cullable = true;
      
      // Make tree interactable using metadata map
      this.objectMetadata.set(tree, { type: 'tree', id: `tree_${i}` });
      this.interactableObjects.push(tree);
      
      this.worldContainer.addChild(tree);
    }

    // Add rocks with GPU optimizations - much fewer for better performance
    for (let i = 0; i < 8; i++) { // Further reduced to make room for other objects
      const rock = this.createRock();
      rock.x = (Math.random() - 0.5) * 1200; // Smaller world for denser gameplay
      rock.y = (Math.random() - 0.5) * 1200;
      
      // Make rock interactable using metadata map
      this.objectMetadata.set(rock, { type: 'rock', id: `rock_${i}` });
      this.interactableObjects.push(rock);
      
      this.worldContainer.addChild(rock);
    }

    // Add crystals for gem mining
    for (let i = 0; i < 6; i++) {
      const crystal = this.createCrystal();
      crystal.x = (Math.random() - 0.5) * 1200;
      crystal.y = (Math.random() - 0.5) * 1200;
      
      // Make crystal interactable using metadata map
      this.objectMetadata.set(crystal, { type: 'crystal', id: `crystal_${i}` });
      this.interactableObjects.push(crystal);
      
      this.worldContainer.addChild(crystal);
    }

    // Add bushes for berry gathering
    for (let i = 0; i < 6; i++) { // Reduced to make room for houses
      const bush = this.createBush();
      bush.x = (Math.random() - 0.5) * 1200;
      bush.y = (Math.random() - 0.5) * 1200;
      
      // Make bush interactable using metadata map
      this.objectMetadata.set(bush, { type: 'bush', id: `bush_${i}` });
      this.interactableObjects.push(bush);
      
      this.worldContainer.addChild(bush);
    }

    // Add houses as buildings
    for (let i = 0; i < 4; i++) {
      const house = this.createHouse();
      // Place houses more spread out to avoid clustering
      const angle = (i / 4) * Math.PI * 2;
      const distance = 300 + Math.random() * 200;
      house.x = Math.cos(angle) * distance;
      house.y = Math.sin(angle) * distance;
      
      // Make house interactable using metadata map
      this.objectMetadata.set(house, { type: 'house', id: `house_${i}` });
      this.interactableObjects.push(house);
      
      this.worldContainer.addChild(house);
    }

    // Add central FieldsTileset surrounded by random field tiles
    this.createFieldArea();

    // Apply GPU optimizations to the world container
    this.gpuOptimizer.optimizeContainer(this.worldContainer);
    
    console.log('✅ World environment created with reduced object count and GPU optimizations');
  }



  createTiledGround() {
    // Create a much more efficient background
    const grassTexture = this.assetManager.getRandomGrassTile();
    
    if (grassTexture) {
      // Create a smaller, viewport-based tiling background instead of huge static one
      const tiledBackground = this.gpuOptimizer.createGPUTiledBackground(grassTexture, 1024, 1024);
      tiledBackground.x = -512;
      tiledBackground.y = -512;
      
      // Enable texture wrapping for infinite appearance
      tiledBackground.cullable = true;
      
      this.worldContainer.addChild(tiledBackground);
      console.log('🌱 Efficient viewport-based tiled ground created');
    } else {
      // Fallback to simple colored ground
      const ground = new PIXI.Graphics();
      ground.rect(-500, -500, 1000, 1000);
      ground.fill(0x228B22); // Forest green
      ground.cullable = true;
      this.worldContainer.addChild(ground);
    }
  }

  createTree() {
    const tree = new PIXI.Container();
    
    // Tree trunk
    const trunk = new PIXI.Graphics();
    trunk.rect(-3, 0, 6, 20);
    trunk.fill(0x8B4513); // Brown
    
    // Tree foliage
    const foliage = new PIXI.Graphics();
    foliage.circle(0, 0, 15);
    foliage.fill(0x006400); // Dark green
    foliage.y = -5;
    
    tree.addChild(trunk);
    tree.addChild(foliage);
    
    return tree;
  }

  createRock() {
    const rockTexture = this.assetManager.getRandomRockSprite();
    if (rockTexture) {
      // Create optimized sprite
      const rock = new PIXI.Sprite(rockTexture);
      
      // Scale rock to reasonable size
      const scale = 0.3 + Math.random() * 0.3; // Random scale between 0.3 and 0.6
      rock.scale.set(scale);
      rock.anchor.set(0.5, 0.8); // Anchor to bottom center for proper positioning
      
      // GPU optimizations
      rock.cullable = true;
      rock.roundPixels = true;
      
      return rock;
    } else {
      // Fallback to old graphics if texture failed to load
      const rock = new PIXI.Graphics();
      rock.circle(0, 0, Math.random() * 8 + 5);
      rock.fill(0x696969); // Gray
      rock.cullable = true;
      return rock;
    }
  }

  createCrystal() {
    const crystalTexture = this.assetManager.getRandomCrystalSprite();
    if (crystalTexture) {
      // Create optimized sprite
      const crystal = new PIXI.Sprite(crystalTexture);
      
      // Scale crystal to reasonable size
      const scale = 0.4 + Math.random() * 0.2; // Random scale between 0.4 and 0.6
      crystal.scale.set(scale);
      crystal.anchor.set(0.5, 0.9); // Anchor to bottom center
      
      // GPU optimizations
      crystal.cullable = true;
      crystal.roundPixels = true;
      
      return crystal;
    } else {
      // Fallback to simple graphics
      const crystal = new PIXI.Graphics();
      crystal.rect(-5, -10, 10, 20);
      crystal.fill(0x00ffff); // Cyan
      crystal.cullable = true;
      return crystal;
    }
  }

  createBush() {
    const bushTexture = this.assetManager.getRandomBushSprite();
    if (bushTexture) {
      // Create optimized sprite
      const bush = new PIXI.Sprite(bushTexture);
      
      // Scale bush to reasonable size
      const scale = 0.5 + Math.random() * 0.3; // Random scale between 0.5 and 0.8
      bush.scale.set(scale);
      bush.anchor.set(0.5, 0.8); // Anchor to bottom center
      
      // GPU optimizations
      bush.cullable = true;
      bush.roundPixels = true;
      
      return bush;
    } else {
      // Fallback to simple graphics
      const bush = new PIXI.Graphics();
      bush.circle(0, 0, 12);
      bush.fill(0x228B22); // Forest green
      bush.cullable = true;
      return bush;
    }
  }

  createHouse() {
    const houseTexture = this.assetManager.getRandomHouseSprite();
    if (houseTexture) {
      // Create optimized sprite
      const house = new PIXI.Sprite(houseTexture);
      
      // Houses should be larger and more prominent
      const scale = 0.8 + Math.random() * 0.4; // Random scale between 0.8 and 1.2
      house.scale.set(scale);
      house.anchor.set(0.5, 0.9); // Anchor to bottom center for proper ground positioning
      
      // GPU optimizations
      house.cullable = true;
      house.roundPixels = true;
      
      return house;
    } else {
      // Fallback to simple graphics
      const house = new PIXI.Graphics();
      // Simple house shape
      house.rect(-25, -30, 50, 30); // Base
      house.fill(0x8B4513); // Brown
      house.rect(-30, -50, 60, 20); // Roof
      house.fill(0x654321); // Dark brown
      house.cullable = true;
      return house;
    }
  }

  createFieldArea() {
    console.log('🌾 Creating field area with central FieldsTileset and surrounding random tiles...');
    
    // Get the main FieldsTileset texture
    const fieldsTilesetTexture = this.assetManager.getFieldsTileset();
    
    if (fieldsTilesetTexture) {
      // Create the central large FieldsTileset sprite
      const centralFieldsTileset = new PIXI.Sprite(fieldsTilesetTexture);
      centralFieldsTileset.anchor.set(0.5, 0.5);
      centralFieldsTileset.x = 0; // Center of the world
      centralFieldsTileset.y = 0;
      
      // Scale it to be prominent but not overwhelming
      const scale = 1.5; // Make it 1.5x larger
      centralFieldsTileset.scale.set(scale);
      
      // GPU optimizations
      centralFieldsTileset.cullable = true;
      centralFieldsTileset.roundPixels = true;
      
      this.worldContainer.addChild(centralFieldsTileset);
      
      // Calculate the size of the central tileset for surrounding tiles positioning
      const tilesetWidth = fieldsTilesetTexture.width * scale;
      const tilesetHeight = fieldsTilesetTexture.height * scale;
      
      // Create surrounding random field tiles
      const surroundingTileCount = 20; // Number of random tiles around the central tileset
      const surroundingRadius = Math.max(tilesetWidth, tilesetHeight) / 2 + 50; // Distance from center
      
      for (let i = 0; i < surroundingTileCount; i++) {
        const randomFieldTile = this.assetManager.getRandomFieldTile();
        if (randomFieldTile) {
          const fieldTile = new PIXI.Sprite(randomFieldTile);
          
          // Random position around the central tileset
          const angle = (Math.random() * Math.PI * 2);
          const distance = surroundingRadius + Math.random() * 150; // Spread them out
          fieldTile.x = Math.cos(angle) * distance;
          fieldTile.y = Math.sin(angle) * distance;
          
          // Random scale and rotation for variety
          const tileScale = 0.8 + Math.random() * 0.6; // Scale between 0.8 and 1.4
          fieldTile.scale.set(tileScale);
          fieldTile.rotation = Math.random() * Math.PI * 2;
          
          // Anchor to center for proper rotation
          fieldTile.anchor.set(0.5, 0.5);
          
          // GPU optimizations
          fieldTile.cullable = true;
          fieldTile.roundPixels = true;
          
          this.worldContainer.addChild(fieldTile);
        }
      }
      
      console.log(`✅ Created central FieldsTileset with ${surroundingTileCount} surrounding random field tiles`);
    } else {
      console.warn('⚠️ FieldsTileset texture not available');
    }
  }

  initializePlayer(character: any) {
    // Update player with character data
    this.player.initializeFromCharacter(character);
    
    // Refresh UI with new character data
    this.uiManager.refreshUI();
    
    console.log('Player initialized with character data:', character.name);
  }

  setupMouseInteractions() {
    // Make stage interactive
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Left click for movement
    this.app.stage.on('pointerdown', (event) => {
      if (event.button === 0) { // Left click
        this.handleLeftClick(event);
      }
    });

    // Right click for interactions
    this.app.stage.on('rightdown', (event) => {
      this.handleRightClick(event);
    });

    // Prevent context menu on right click
    this.app.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Mouse wheel for zooming
    this.app.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // Normalize wheel delta across browsers
      const delta = e.deltaY > 0 ? -1 : 1; // Invert so scroll up = zoom in
      this.adjustZoom(delta);
    });
  }

  handleLeftClick(event: any) {
    // Convert screen coordinates to world coordinates
    const worldPos = this.screenToWorld(event.global.x, event.global.y);
    
    // Set target position for movement
    this.targetPosition = { x: worldPos.x, y: worldPos.y };
    
    // Show movement indicator
    this.showMoveIndicator(worldPos.x, worldPos.y);
    
    console.log(`Moving to: ${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}`);
  }

  handleRightClick(event: any) {
    const worldPos = this.screenToWorld(event.global.x, event.global.y);
    
    // Check for interactable objects near click position
    const interactable = this.findInteractableAt(worldPos.x, worldPos.y);
    
    if (interactable) {
      this.interactWithObject(interactable, worldPos);
    } else {
      console.log('Nothing to interact with here');
    }
  }

  screenToWorld(screenX: number, screenY: number) {
    // Convert screen coordinates to world coordinates accounting for camera position and zoom
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    
    return {
      x: (screenX - centerX) / this.cameraZoom + this.player.x,
      y: (screenY - centerY) / this.cameraZoom + this.player.y
    };
  }

  findInteractableAt(x: number, y: number) {
    const interactionRange = 30; // pixels
    
    for (const obj of this.interactableObjects) {
      const distance = Math.sqrt((obj.x - x) ** 2 + (obj.y - y) ** 2);
      if (distance <= interactionRange) {
        // Check if object is already used
        const metadata = this.objectMetadata.get(obj);
        const objType = metadata?.type;
        if (objType === 'tree' && (metadata as any)?.chopped) {
          continue; // Skip chopped trees
        }
        if (objType === 'rock' && (metadata as any)?.mined) {
          continue; // Skip mined rocks
        }
        if (objType === 'crystal' && (metadata as any)?.mined) {
          continue; // Skip mined crystals
        }
        if (objType === 'bush' && (metadata as any)?.harvested) {
          continue; // Skip harvested bushes
        }
        return obj;
      }
    }
    return null;
  }

  interactWithObject(object: any, clickPos: { x: number; y: number }) {
    const metadata = this.objectMetadata.get(object);
    const objType = metadata?.type;
    
    switch (objType) {
      case 'tree':
        this.woodcutTree(object);
        break;
      case 'rock':
        this.mineRock(object);
        break;
      case 'crystal':
        this.mineCrystal(object);
        break;
      case 'bush':
        this.harvestBush(object);
        break;
      case 'house':
        this.enterHouse(object);
        break;
      default:
        console.log('Unknown object type:', objType);
    }
  }

  woodcutTree(tree: any) {
    const metadata = this.objectMetadata.get(tree) as any;
    if (metadata?.being_cut) {
      console.log('Tree is already being chopped!');
      return;
    }

    // Check if player has required woodcutting level
    const gatherCheck = this.skillManager.canGather('woodcutting', 'tree');
    if (!gatherCheck.canGather) {
      this.hud.showAction(`❌ Need Woodcutting level ${gatherCheck.levelRequired}!`);
      this.showFloatingText(tree.x, tree.y - 20, `Level ${gatherCheck.levelRequired} required!`, 0xff0000);
      return;
    }

    console.log('🪓 Chopping tree...');
    if (metadata) metadata.being_cut = true;
    
    // Show action in HUD
    this.hud.showAction('🪓 Chopping tree...');
    
    // Add visual effect - make tree shake
    const originalX = tree.x;
    let shakeCount = 0;
    const shake = () => {
      if (shakeCount < 20) {
        tree.x = originalX + (Math.random() - 0.5) * 2;
        shakeCount++;
        setTimeout(shake, 50);
      } else {
        tree.x = originalX;
        // Tree chopped down
        tree.alpha = 0.5;
        if (metadata) metadata.chopped = true;
        
        // Calculate and award XP
        const xpGain = this.skillManager.calculateXPGain('woodcutting', 'tree');
        const skillGain = this.skillManager.addXP('woodcutting', xpGain);
        
        console.log(`🌳 Tree chopped! +1 Wood, +${xpGain} Woodcutting XP`);
        
        // Update resources
        this.playerResources.wood++;
        this.hud.updateResources(this.playerResources);
        
        // Save skills progress
        this.skillManager.saveSkills();
        
        // Update UI manager to refresh skills
        this.uiManager.refreshUI();
        
        // Add floating text effects
        this.showFloatingText(tree.x, tree.y - 20, '+1 Wood', 0x00ff00);
        this.showFloatingText(tree.x - 30, tree.y - 35, `+${xpGain} WC XP`, 0x87CEEB);
        
        // Show level up if applicable
        if (skillGain.leveledUp) {
          this.showLevelUpNotification('Woodcutting', skillGain.newLevel!);
        }
      }
    };
    shake();
  }

  mineRock(rock: any) {
    const metadata = this.objectMetadata.get(rock) as any;
    if (metadata?.being_mined) {
      console.log('Rock is already being mined!');
      return;
    }

    // Check if player has required mining level
    const gatherCheck = this.skillManager.canGather('mining', 'rock');
    if (!gatherCheck.canGather) {
      this.hud.showAction(`❌ Need Mining level ${gatherCheck.levelRequired}!`);
      this.showFloatingText(rock.x, rock.y - 15, `Level ${gatherCheck.levelRequired} required!`, 0xff0000);
      return;
    }

    console.log('⛏️ Mining rock...');
    if (metadata) metadata.being_mined = true;
    
    // Show action in HUD
    this.hud.showAction('⛏️ Mining rock...');
    
    // Add visual effect - make rock flash
    let flashCount = 0;
    const flash = () => {
      if (flashCount < 15) {
        rock.alpha = flashCount % 2 === 0 ? 1 : 0.7;
        flashCount++;
        setTimeout(flash, 100);
      } else {
        rock.alpha = 0.3;
        if (metadata) metadata.mined = true;
        
        // Calculate and award XP
        const xpGain = this.skillManager.calculateXPGain('mining', 'rock');
        const skillGain = this.skillManager.addXP('mining', xpGain);
        
        console.log(`🪨 Rock mined! +1 Ore, +${xpGain} Mining XP`);
        
        // Update resources
        this.playerResources.ore++;
        this.hud.updateResources(this.playerResources);
        
        // Save skills progress
        this.skillManager.saveSkills();
        
        // Update UI manager to refresh skills
        this.uiManager.refreshUI();
        
        // Add floating text effects
        this.showFloatingText(rock.x, rock.y - 15, '+1 Ore', 0xaaaaaa);
        this.showFloatingText(rock.x - 30, rock.y - 30, `+${xpGain} Mining XP`, 0x87CEEB);
        
        // Show level up if applicable
        if (skillGain.leveledUp) {
          this.showLevelUpNotification('Mining', skillGain.newLevel!);
        }
      }
    };
    flash();
  }

  mineCrystal(crystal: any) {
    const metadata = this.objectMetadata.get(crystal) as any;
    if (metadata?.being_mined) {
      console.log('Crystal is already being mined!');
      return;
    }

    // Check if player has required mining level for crystals
    const gatherCheck = this.skillManager.canGather('mining', 'crystal');
    if (!gatherCheck.canGather) {
      this.hud.showAction(`❌ Need Mining level ${gatherCheck.levelRequired} for crystals!`);
      this.showFloatingText(crystal.x, crystal.y - 20, `Level ${gatherCheck.levelRequired} required!`, 0xff0000);
      return;
    }

    console.log('💎 Mining crystal...');
    if (metadata) metadata.being_mined = true;
    
    // Show action in HUD
    this.hud.showAction('💎 Mining crystal...');
    
    // Add visual effect - make crystal sparkle
    let sparkleCount = 0;
    const sparkle = () => {
      if (sparkleCount < 12) {
        crystal.alpha = sparkleCount % 2 === 0 ? 1 : 0.8;
        crystal.rotation += 0.1;
        sparkleCount++;
        setTimeout(sparkle, 80);
      } else {
        crystal.alpha = 0.4;
        crystal.rotation = 0;
        if (metadata) metadata.mined = true;
        
        // Calculate and award XP (crystals give more XP)
        const xpGain = this.skillManager.calculateXPGain('mining', 'crystal');
        const skillGain = this.skillManager.addXP('mining', xpGain);
        
        console.log(`💎 Crystal mined! +1 Gem, +${xpGain} Mining XP`);
        
        // Update resources
        this.playerResources.gems++;
        this.hud.updateResources(this.playerResources);
        
        // Save skills progress
        this.skillManager.saveSkills();
        
        // Update UI manager to refresh skills
        this.uiManager.refreshUI();
        
        // Add floating text effects
        this.showFloatingText(crystal.x, crystal.y - 20, '+1 Gem', 0xff00ff);
        this.showFloatingText(crystal.x - 30, crystal.y - 35, `+${xpGain} Mining XP`, 0x87CEEB);
        
        // Show level up if applicable
        if (skillGain.leveledUp) {
          this.showLevelUpNotification('Mining', skillGain.newLevel!);
        }
      }
    };
    sparkle();
  }

  harvestBush(bush: any) {
    const metadata = this.objectMetadata.get(bush) as any;
    if (metadata?.being_harvested) {
      console.log('Bush is already being harvested!');
      return;
    }

    // Check if player has required harvesting level
    const gatherCheck = this.skillManager.canGather('harvesting', 'bush');
    if (!gatherCheck.canGather) {
      this.hud.showAction(`❌ Need Harvesting level ${gatherCheck.levelRequired}!`);
      this.showFloatingText(bush.x, bush.y - 15, `Level ${gatherCheck.levelRequired} required!`, 0xff0000);
      return;
    }

    console.log('🫐 Harvesting berries...');
    if (metadata) metadata.being_harvested = true;
    
    // Show action in HUD
    this.hud.showAction('🫐 Harvesting berries...');
    
    // Add visual effect - make bush rustle
    const originalScale = bush.scale.x;
    let rustleCount = 0;
    const rustle = () => {
      if (rustleCount < 8) {
        bush.scale.set(originalScale + (rustleCount % 2 === 0 ? 0.1 : -0.1));
        rustleCount++;
        setTimeout(rustle, 100);
      } else {
        bush.scale.set(originalScale * 0.7);
        bush.alpha = 0.6;
        if (metadata) metadata.harvested = true;
        
        // Calculate and award XP
        const xpGain = this.skillManager.calculateXPGain('harvesting', 'bush');
        const skillGain = this.skillManager.addXP('harvesting', xpGain);
        
        console.log(`🫐 Berries harvested! +1 Berry, +${xpGain} Harvesting XP`);
        
        // Update resources
        this.playerResources.berries++;
        this.hud.updateResources(this.playerResources);
        
        // Save skills progress
        this.skillManager.saveSkills();
        
        // Update UI manager to refresh skills
        this.uiManager.refreshUI();
        
        // Add floating text effects
        this.showFloatingText(bush.x, bush.y - 15, '+1 Berry', 0x8B4513);
        this.showFloatingText(bush.x - 30, bush.y - 30, `+${xpGain} Harvest XP`, 0x87CEEB);
        
        // Show level up if applicable
        if (skillGain.leveledUp) {
          this.showLevelUpNotification('Harvesting', skillGain.newLevel!);
        }
      }
    };
    rustle();
  }

  enterHouse(house: any) {
    const metadata = this.objectMetadata.get(house) as any;
    console.log('🏠 Entering house...');
    
    // Show action in HUD
    this.hud.showAction('🏠 Entering house...');
    
    // Add visual effect - make house glow briefly
    let glowCount = 0;
    const originalAlpha = house.alpha;
    const glow = () => {
      if (glowCount < 6) {
        house.alpha = glowCount % 2 === 0 ? 1.0 : 0.8;
        glowCount++;
        setTimeout(glow, 150);
      } else {
        house.alpha = originalAlpha;
        
        // For now, just show a message - could expand to open house UI later
        console.log('🏠 Welcome home! This could open an interior view or shop.');
        
        // Show a longer action message
        this.hud.showAction('🏠 Welcome home! Safe place to rest.');
        
        // Could add functionality like:
        // - Restore health
        // - Access storage
        // - Crafting station
        // - Shop interface
        
        // For now, just restore some "energy" as an example
        this.showFloatingText(house.x, house.y - 30, 'Welcome Home!', 0xffd700);
      }
    };
    glow();
  }

  showFloatingText(x: number, y: number, text: string, color: number) {
    const textObj = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: color,
      fontWeight: 'bold'
    });
    
    textObj.x = x;
    textObj.y = y;
    textObj.anchor.set(0.5, 0.5);
    
    this.worldContainer.addChild(textObj);
    
    // Animate floating upward and fade out
    let offsetY = 0;
    const animate = () => {
      offsetY += 1;
      textObj.y = y - offsetY;
      textObj.alpha = Math.max(0, 1 - offsetY / 30);
      
      if (textObj.alpha > 0) {
        requestAnimationFrame(animate);
      } else {
        this.worldContainer.removeChild(textObj);
      }
    };
    requestAnimationFrame(animate);
  }

  showMoveIndicator(x: number, y: number) {
    this.moveIndicator.clear();
    this.moveIndicator.circle(x, y, 8);
    this.moveIndicator.stroke({ width: 2, color: 0x00ff00 });
    this.moveIndicator.circle(x, y, 4);
    this.moveIndicator.fill(0x00ff00);
    
    // Fade out the indicator after a short time
    this.moveIndicator.alpha = 1;
    const fadeOut = () => {
      this.moveIndicator.alpha -= 0.05;
      if (this.moveIndicator.alpha > 0) {
        requestAnimationFrame(fadeOut);
      }
    };
    setTimeout(fadeOut, 500);
  }

  showLevelUpNotification(skillName: string, newLevel: number) {
    // Create prominent level up notification
    const notification = new PIXI.Container();
    
    // Background glow
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, 100);
    glow.fill({ color: 0xffd700, alpha: 0.3 });
    notification.addChild(glow);
    
    // Main text
    const levelUpText = new PIXI.Text({
      text: '🎉 LEVEL UP! 🎉',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xffd700,
        stroke: { color: 0x000000, width: 2 },
        align: 'center'
      }
    });
    levelUpText.anchor.set(0.5, 0.5);
    levelUpText.y = -15;
    notification.addChild(levelUpText);
    
    // Skill info text
    const skillText = new PIXI.Text({
      text: `${skillName} Level ${newLevel}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fontWeight: 'bold',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 1 },
        align: 'center'
      }
    });
    skillText.anchor.set(0.5, 0.5);
    skillText.y = 15;
    notification.addChild(skillText);
    
    // Position above player
    notification.x = this.player.x;
    notification.y = this.player.y - 80;
    
    this.worldContainer.addChild(notification);
    
    // Animate the notification
    let scale = 0;
    let alpha = 1;
    const animate = () => {
      if (scale < 1) {
        scale += 0.05;
        notification.scale.set(scale);
        requestAnimationFrame(animate);
      } else {
        // Hold for a moment, then fade out
        setTimeout(() => {
          const fadeOut = () => {
            alpha -= 0.02;
            notification.alpha = alpha;
            if (alpha > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              this.worldContainer.removeChild(notification);
            }
          };
          fadeOut();
        }, 2000);
      }
    };
    animate();
    
    // Play a congratulatory sound effect if available
    console.log(`🎉 ${skillName} Level Up! Now level ${newLevel}!`);
  }

  update() {
    // Handle keyboard movement (still works alongside mouse)
    let dx = 0;
    let dy = 0;
    const speed = 4;

    if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) dy -= speed;
    if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) dy += speed;
    if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) dx -= speed;
    if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) dx += speed;

    // Handle mouse movement to target
    if (this.targetPosition && (dx === 0 && dy === 0)) { // Only mouse move if not using keyboard
      const distanceToTarget = Math.sqrt(
        (this.targetPosition.x - this.player.x) ** 2 + 
        (this.targetPosition.y - this.player.y) ** 2
      );

      if (distanceToTarget > 3) { // Close enough threshold
        const moveSpeed = Math.min(speed, distanceToTarget / 10); // Slow down when approaching
        dx = ((this.targetPosition.x - this.player.x) / distanceToTarget) * moveSpeed;
        dy = ((this.targetPosition.y - this.player.y) / distanceToTarget) * moveSpeed;
      } else {
        this.targetPosition = null; // Reached target
      }
    }

    // Clear target if using keyboard
    if ((dx !== 0 || dy !== 0) && this.targetPosition && 
        (this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d'] ||
         this.keys['W'] || this.keys['S'] || this.keys['A'] || this.keys['D'] ||
         this.keys['ArrowUp'] || this.keys['ArrowDown'] || this.keys['ArrowLeft'] || this.keys['ArrowRight'])) {
      this.targetPosition = null;
    }

    // Update player position and animation
    const isMoving = dx !== 0 || dy !== 0;
    this.player.move(dx, dy);
    this.player.updateAnimation(isMoving);

    // Update camera to follow player
    this.updateCamera();
  }

  updateCamera() {
    // Center camera on player, accounting for zoom level
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    
    this.camera.x = centerX - (this.player.x * this.cameraZoom);
    this.camera.y = centerY - (this.player.y * this.cameraZoom);
    
    // Perform viewport culling to hide objects outside view
    this.performViewportCulling();
  }

  performViewportCulling() {
    const margin = 100; // Extra margin for smooth transitions
    const halfWidth = (this.app.screen.width / 2) / this.cameraZoom;
    const halfHeight = (this.app.screen.height / 2) / this.cameraZoom;
    
    const viewBounds = {
      left: this.player.x - halfWidth - margin,
      right: this.player.x + halfWidth + margin,
      top: this.player.y - halfHeight - margin,
      bottom: this.player.y + halfHeight + margin
    };

    // Cull objects outside viewport
    for (const obj of this.interactableObjects) {
      const inView = obj.x >= viewBounds.left && 
                    obj.x <= viewBounds.right && 
                    obj.y >= viewBounds.top && 
                    obj.y <= viewBounds.bottom;
      
      obj.visible = inView;
      obj.renderable = inView; // Additional GPU optimization
    }
  }

  setZoom(newZoom: number) {
    // Clamp zoom between min and max values
    this.cameraZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    
    // Apply zoom to camera
    this.camera.scale.set(this.cameraZoom);
    
    // Update camera position to maintain player centering
    this.updateCamera();
    
    console.log(`🔍 Camera zoom: ${this.cameraZoom.toFixed(2)}x`);
  }

  adjustZoom(delta: number) {
    const zoomSpeed = 0.1;
    const newZoom = this.cameraZoom + (delta * zoomSpeed);
    this.setZoom(newZoom);
  }

  setKeyState(key: string, pressed: boolean) {
    this.keys[key] = pressed;
  }
} 