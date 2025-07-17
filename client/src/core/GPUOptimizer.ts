import * as PIXI from 'pixi.js';

export class GPUOptimizer {
  app: PIXI.Application;
  particleContainers: Map<string, PIXI.ParticleContainer> = new Map();
  spritePools: Map<string, PIXI.Sprite[]> = new Map();
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.setupGPUOptimizations();
  }

  private setupGPUOptimizations() {
    // Enable GPU-based rendering optimizations
    console.log('🚀 Setting up GPU optimizations...');
    
    // Create optimized particle containers for different object types
    this.createParticleContainer('rocks', 100, {
      scale: true,
      position: true,
      rotation: false,
      uvs: false,
      alpha: true
    });
    
    this.createParticleContainer('trees', 100, {
      scale: true,
      position: true,
      rotation: false,
      uvs: false,
      alpha: true
    });
    
    this.createParticleContainer('effects', 200, {
      scale: true,
      position: true,
      rotation: true,
      uvs: false,
      alpha: true
    });
    
    console.log('✅ GPU optimization containers created');
  }

  private createParticleContainer(name: string, maxSize: number, properties: any) {
    const container = new PIXI.ParticleContainer(maxSize, properties);
    container.interactiveChildren = false; // GPU optimization
    this.particleContainers.set(name, container);
  }

  getParticleContainer(name: string): PIXI.ParticleContainer | undefined {
    return this.particleContainers.get(name);
  }

  // Create optimized sprites with object pooling
  createOptimizedSprite(texture: PIXI.Texture, poolName: string): PIXI.Sprite {
    let pool = this.spritePools.get(poolName);
    if (!pool) {
      pool = [];
      this.spritePools.set(poolName, pool);
    }

    // Reuse existing sprite if available
    let sprite = pool.pop();
    if (!sprite) {
      sprite = new PIXI.Sprite(texture);
      // GPU optimization settings
      sprite.roundPixels = true; // Prevent sub-pixel rendering
    } else {
      sprite.texture = texture;
      sprite.visible = true;
      sprite.alpha = 1;
    }

    return sprite;
  }

  // Return sprite to pool for reuse
  recycleSprite(sprite: PIXI.Sprite, poolName: string) {
    sprite.visible = false;
    sprite.parent?.removeChild(sprite);
    
    let pool = this.spritePools.get(poolName);
    if (!pool) {
      pool = [];
      this.spritePools.set(poolName, pool);
    }
    
    pool.push(sprite);
  }

  // Create GPU-accelerated tiling background
  createGPUTiledBackground(texture: PIXI.Texture, width: number, height: number): PIXI.TilingSprite {
    // Use PIXI v8 compatible constructor
    const tilingSprite = new PIXI.TilingSprite({
      texture: texture,
      width: width,
      height: height
    });
    
    // GPU optimizations
    tilingSprite.roundPixels = true;
    tilingSprite.cullable = true; // Enable frustum culling
    
    // Use GPU-based texture repeat instead of CPU sprite generation (PIXI v8 compatible)
    if (texture.source) {
      texture.source.addressMode = 'repeat';
      texture.source.scaleMode = 'nearest'; // Pixelated look, faster
    }
    
    return tilingSprite;
  }

  // Create GPU-accelerated filters for effects
  createGPUFilters() {
    return {
      // GPU-based glow effect
      glow: new PIXI.filters.GlowFilter({
        distance: 10,
        outerStrength: 1,
        innerStrength: 0,
        color: 0xffffff,
        quality: 0.1 // Lower quality for better performance
      }),
      
      // GPU-based blur for depth of field
      blur: new PIXI.filters.BlurFilter(2, 2, 1, 5),
      
      // GPU-based color adjustment
      colorMatrix: new PIXI.filters.ColorMatrixFilter()
    };
  }

  // Optimize existing containers for GPU rendering
  optimizeContainer(container: PIXI.Container) {
    // Enable GPU optimizations
    container.cullable = true; // Enable frustum culling
    container.sortableChildren = false; // Disable CPU sorting when possible
    
    // Optimize all children
    for (const child of container.children) {
      if (child instanceof PIXI.Sprite) {
        child.roundPixels = true;
        child.cullable = true;
      } else if (child instanceof PIXI.Container) {
        this.optimizeContainer(child);
      }
    }
  }

  // GPU-based batch rendering for similar objects
  createBatchRenderer(objects: { texture: PIXI.Texture, x: number, y: number, scale?: number }[], container: PIXI.Container) {
    // Group objects by texture for batch rendering
    const batches = new Map<PIXI.Texture, typeof objects>();
    
    for (const obj of objects) {
      if (!batches.has(obj.texture)) {
        batches.set(obj.texture, []);
      }
      batches.get(obj.texture)!.push(obj);
    }

    // Create batch containers
    for (const [texture, batch] of batches) {
      const particleContainer = new PIXI.ParticleContainer(batch.length, {
        scale: true,
        position: true,
        rotation: false,
        uvs: false,
        alpha: true
      });

      for (const obj of batch) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = obj.x;
        sprite.y = obj.y;
        if (obj.scale) sprite.scale.set(obj.scale);
        sprite.roundPixels = true;
        particleContainer.addChild(sprite);
      }

      container.addChild(particleContainer);
    }
  }

  // Monitor and report GPU performance
  getPerformanceStats() {
    return {
      drawCalls: this.app.renderer.gl?.getParameter(this.app.renderer.gl.DRAW_CALLS) || 0,
      textureBindings: this.app.renderer.gl?.getParameter(this.app.renderer.gl.TEXTURE_BINDING_2D) || 0,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      renderTime: this.app.ticker.elapsedMS
    };
  }

  // Clean up GPU resources
  dispose() {
    for (const container of this.particleContainers.values()) {
      container.destroy({ children: true, texture: false, baseTexture: false });
    }
    
    for (const pool of this.spritePools.values()) {
      for (const sprite of pool) {
        sprite.destroy({ texture: false, baseTexture: false });
      }
    }
    
    this.particleContainers.clear();
    this.spritePools.clear();
  }
} 