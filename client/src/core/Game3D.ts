import * as THREE from 'three';

export class Game3D {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private container!: HTMLElement;

  private player!: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private targetPosition: THREE.Vector3 | null = null;
  private network: any | null = null;
  private otherPlayers: Map<string, THREE.Mesh> = new Map();
  private renderOtherPlayers = true; // show remote players by default

  // Orbit camera state (OSRS-style)
  private camYaw = 0; // radians
  private camPitch = THREE.MathUtils.degToRad(35);
  private camDistance = 18;
  private targetCamDistance = 18;
  private minPitch = THREE.MathUtils.degToRad(15);
  private maxPitch = THREE.MathUtils.degToRad(75);
  private minDistance = 8;
  private maxDistance = 40;
  private isOrbiting = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private orbitSpeed = 0.005;
  private pitchSpeed = 0.005;
  private yawNudge = THREE.MathUtils.degToRad(10);

  // Context menu UI
  private ctxMenuEl: HTMLDivElement | null = null;
  private tooltipEl: HTMLDivElement | null = null;
  private hoverTarget: THREE.Object3D | null = null;
  private pathRing: THREE.Object3D | null = null;
  private pathRingLife = 0;

  constructor() {
    this.clock = new THREE.Clock();
  }

  static async create(container: HTMLElement, network?: any): Promise<Game3D> {
    const game = new Game3D();
    game.container = container;
    game.network = network || null;
    game.initRenderer();
    game.initScene();
    game.initCamera();
    game.initLights();
    game.initGround();
    game.initPlayer();
    game.initSampleTargets();
    game.bindEvents();
    // Ensure camera positioned relative to player
    game.updateCameraImmediate();
    game.createContextMenu();
    game.createTooltip();
    game.animate();
    game.initNetworking();
    return game;
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  private initCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  private initLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);
  }

  private initGround() {
    const geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x3a7f3a });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = false;
    ground.name = 'GROUND';
    this.scene.add(ground);
  }

  private initPlayer() {
    const body = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
    this.player = new THREE.Mesh(body, mat);
    this.player.position.set(0, 1, 0);
    this.player.castShadow = false;
    this.scene.add(this.player);
  }

  private initNetworking() {
    if (!this.network) return;
    this.network.onPlayerJoined = (playerId: string) => {
      if (!this.renderOtherPlayers) return;
      if (this.otherPlayers.has(playerId)) return;
      const body = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x9ca3af });
      const m = new THREE.Mesh(body, mat);
      m.position.set(0, 1, 0);
      this.otherPlayers.set(playerId, m);
      this.scene.add(m);
    };
    this.network.onPlayerLeft = (playerId: string) => {
      const m = this.otherPlayers.get(playerId);
      if (m) { this.scene.remove(m); (m.material as any).dispose?.(); m.geometry.dispose(); this.otherPlayers.delete(playerId); }
    };
    this.network.onPlayerMoved = (playerId: string, pos: { x: number; y: number; z: number }) => {
      if (!this.renderOtherPlayers) return;
      const m = this.otherPlayers.get(playerId);
      if (m) m.position.set(pos.x, pos.y, pos.z);
    };
  }

  private initSampleTargets() {
    // Sample NPC
    const npcGeo = new THREE.ConeGeometry(0.5, 1.6, 8);
    const npcMat = new THREE.MeshStandardMaterial({ color: 0xb56576 });
    const npc = new THREE.Mesh(npcGeo, npcMat);
    npc.position.set(4, 0.8, -3);
    npc.userData.type = 'npc';
    npc.name = 'NPC Guard';
    this.scene.add(npc);

    // Sample Object (Rock)
    const objGeo = new THREE.IcosahedronGeometry(0.7, 0);
    const objMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const rock = new THREE.Mesh(objGeo, objMat);
    rock.position.set(-5, 0.7, 2);
    rock.userData.type = 'object';
    rock.name = 'Rock';
    this.scene.add(rock);
  }

  private bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderer.domElement.addEventListener('pointerdown', async (e: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const sy = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointer.set(sx, sy);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      const groundHit = hits.find((h: THREE.Intersection) => (h.object as THREE.Object3D).name === 'GROUND');
      const firstNonGround = hits.find((h: THREE.Intersection) => (h.object as THREE.Object3D).name !== 'GROUND' && (h.object as THREE.Object3D) !== this.player);

      // LMB: Move
      if (e.button === 0) {
        if (groundHit) {
          const point = groundHit.point.clone();
          point.y = 1;
          this.targetPosition = point;
          this.showPathRing(point);
          window.dispatchEvent(new CustomEvent('game-action', { detail: { type: 'move', text: `Moving to (${point.x.toFixed(1)}, ${point.z.toFixed(1)})` } }));
          this.network?.sendMove({ x: point.x, y: 1, z: point.z });
        }
      }

      // RMB: Interact/attack or context when Shift held
      if (e.button === 2) {
        // Always suppress browser context menu
        (e as MouseEvent).preventDefault();
        if ((e as MouseEvent).shiftKey) {
          // Shift+RMB: open context menu
          this.showContextMenu(e.clientX, e.clientY, firstNonGround || null, groundHit || null);
        } else {
          if (firstNonGround) {
            // Interact: move to hit point and log action (placeholder)
            const p = firstNonGround.point.clone();
            p.y = 1;
            this.targetPosition = p;
            console.log('Interact/Attack target:', (firstNonGround.object as THREE.Object3D).name || firstNonGround.object.uuid);
            this.flashObject(firstNonGround.object as THREE.Object3D);
            const label = (firstNonGround.object as THREE.Object3D).name || 'Target';
            window.dispatchEvent(new CustomEvent('game-action', { detail: { type: 'interact', text: `Interacting with ${label}` } }));
          } else if (groundHit) {
            const p = groundHit.point.clone();
            p.y = 1;
            this.targetPosition = p;
            this.showPathRing(p);
            window.dispatchEvent(new CustomEvent('game-action', { detail: { type: 'move', text: `Moving to (${p.x.toFixed(1)}, ${p.z.toFixed(1)})` } }));
            this.network?.sendMove({ x: p.x, y: 1, z: p.z });
          }
        }
      }

      // MMB: Orbit
      if (e.button === 1) {
        this.isOrbiting = true;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
      }
    });

    this.renderer.domElement.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isOrbiting) return;
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;

      this.camYaw -= dx * this.orbitSpeed;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch - dy * this.pitchSpeed, this.minPitch, this.maxPitch);
    });

    // Hover tooltip detection
    this.renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const sy = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointer.set(sx, sy);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      const hit = hits.find(h => (h.object as THREE.Object3D) !== this.player && (h.object as THREE.Object3D).name !== 'GROUND');
      if (hit) {
        this.hoverTarget = hit.object as THREE.Object3D;
        const label = this.hoverTarget.name || (this.hoverTarget.userData?.type || 'Object');
        this.showTooltip(e.clientX, e.clientY, label);
      } else {
        this.hoverTarget = null;
        this.hideTooltip();
      }
    });

    const endOrbit = () => { this.isOrbiting = false; };
    window.addEventListener('pointerup', endOrbit);
    window.addEventListener('pointerleave', endOrbit);

    this.renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const step = (this.maxDistance - this.minDistance) * 0.08;
      this.targetCamDistance = THREE.MathUtils.clamp(this.targetCamDistance + delta * step, this.minDistance, this.maxDistance);
    }, { passive: false });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') this.camYaw += this.yawNudge;
      if (e.key === 'e' || e.key === 'E') this.camYaw -= this.yawNudge;
      if (e.key === '+' || e.key === '=') this.targetCamDistance = Math.max(this.minDistance, this.targetCamDistance - 1);
      if (e.key === '-' || e.key === '_') this.targetCamDistance = Math.min(this.maxDistance, this.targetCamDistance + 1);
    });

    this.renderer.domElement.addEventListener('contextmenu', (e: MouseEvent) => {
      // Always prevent the browser menu on the canvas
      e.preventDefault();
      if ((e as MouseEvent).shiftKey) {
        // If Shift was held, show menu with current ray under cursor
        const rect = this.renderer.domElement.getBoundingClientRect();
        const sx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const sy = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.pointer.set(sx, sy);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObjects(this.scene.children, true);
        const groundHit = hits.find(h => (h.object as THREE.Object3D).name === 'GROUND') || null;
        const firstNonGround = hits.find(h => (h.object as THREE.Object3D).name !== 'GROUND' && (h.object as THREE.Object3D) !== this.player) || null;
        this.showContextMenu(e.clientX, e.clientY, firstNonGround, groundHit);
      }
    });
  }

  private update(delta: number) {
    if (this.targetPosition) {
      const toTarget = new THREE.Vector3().subVectors(this.targetPosition, this.player.position);
      const dist = toTarget.length();
      if (dist < 0.15) {
        this.targetPosition = null;
      } else {
        toTarget.normalize();
        const base = 3.5;
        const speed = base + Math.min(dist, 8) * 0.2;
        this.player.position.addScaledVector(toTarget, Math.min(speed * delta, dist));
      }
    }
    this.smoothUpdateCamera();

    // Animate path ring
    if (this.pathRing && this.pathRingLife > 0) {
      this.pathRingLife -= delta;
      const material = (this.pathRing as any).material as THREE.Material & { opacity?: number };
      if (material && 'opacity' in material) {
        material.opacity = Math.max(0, this.pathRingLife / 0.8);
      }
      this.pathRing.scale.setScalar(1 + (1 - (material?.opacity ?? 0)) * 0.5);
      if (this.pathRingLife <= 0) {
        this.scene.remove(this.pathRing);
        const geo = (this.pathRing as any).geometry as THREE.BufferGeometry | undefined;
        const mat = (this.pathRing as any).material as THREE.Material | undefined;
        geo?.dispose();
        mat?.dispose?.();
        this.pathRing = null;
      }
    }
  }

  private animate = () => {
    const delta = this.clock.getDelta();
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };

  public getCameraYaw(): number {
    return this.camYaw;
  }

  private classifyTarget(object: THREE.Object3D): 'npc' | 'object' | 'player' | 'unknown' {
    if (object === this.player) return 'player';
    const t = (object as any).userData?.type as string | undefined;
    if (t === 'npc') return 'npc';
    if (t === 'object') return 'object';
    const name = (object.name || '').toUpperCase();
    if (name.startsWith('NPC')) return 'npc';
    if (name.startsWith('OBJ') || name.startsWith('OBJECT')) return 'object';
    return 'unknown';
  }

  private createContextMenu() {
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.zIndex = '10000';
    menu.style.background = '#1f2430';
    menu.style.border = '1px solid #3b4252';
    menu.style.borderRadius = '6px';
    menu.style.padding = '6px 0';
    menu.style.minWidth = '180px';
    menu.style.color = '#e5e7eb';
    menu.style.font = "14px 'Segoe UI', Arial, sans-serif";
    menu.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    menu.style.display = 'none';
    document.body.appendChild(menu);
    this.ctxMenuEl = menu;
    // Prevent native browser context menu over our custom menu
    menu.addEventListener('contextmenu', (e) => e.preventDefault());

    const hide = () => { if (this.ctxMenuEl) this.ctxMenuEl.style.display = 'none'; };
    window.addEventListener('click', hide);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  }

  private showContextMenu(clientX: number, clientY: number, targetHit: THREE.Intersection | null, groundHit: THREE.Intersection | null) {
    if (!this.ctxMenuEl) return;
    const menu = this.ctxMenuEl;
    menu.innerHTML = '';

    const addItem = (label: string, cb: () => void, emphasize = false) => {
      const item = document.createElement('div');
      item.textContent = label;
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.fontWeight = emphasize ? '600' : '400';
      item.onmouseenter = () => { item.style.background = '#2b3040'; };
      item.onmouseleave = () => { item.style.background = 'transparent'; };
      item.onclick = () => { cb(); menu.style.display = 'none'; };
      menu.appendChild(item);
    };

    const addDivider = () => {
      const hr = document.createElement('div');
      hr.style.height = '1px';
      hr.style.background = '#3b4252';
      hr.style.margin = '6px 0';
      menu.appendChild(hr);
    };

    if (targetHit && (targetHit.object as THREE.Object3D) !== this.player) {
      const object = targetHit.object as THREE.Object3D;
      const kind = this.classifyTarget(object);
      const label = object.name || (kind === 'npc' ? 'NPC' : 'Object');

      // Title
      const title = document.createElement('div');
      title.textContent = label;
      title.style.padding = '6px 12px';
      title.style.color = '#9aa3b2';
      title.style.fontSize = '12px';
      menu.appendChild(title);
      addDivider();

      if (kind === 'npc') {
        addItem('Attack', () => {
          const p = targetHit.point.clone(); p.y = 1; this.targetPosition = p;
          console.log('Attack', label);
        }, true);
      } else {
        addItem('Interact', () => {
          const p = targetHit.point.clone(); p.y = 1; this.targetPosition = p;
          console.log('Interact with', label);
        }, true);
      }
      addItem('Examine', () => { console.log('Examine', label, object); });
      if (groundHit) {
        addDivider();
        addItem('Move here', () => {
          const p = groundHit.point.clone(); p.y = 1; this.targetPosition = p;
        });
      }
    } else if (groundHit) {
      addItem('Move here', () => {
        const p = groundHit.point.clone(); p.y = 1; this.targetPosition = p;
      }, true);
      addItem('Examine ground', () => {
        console.log('Ground', groundHit.point.x.toFixed(2), groundHit.point.z.toFixed(2));
      });
    } else {
      addItem('Nothing to do here', () => {});
    }

    const clampX = Math.min(clientX, window.innerWidth - 200);
    const clampY = Math.min(clientY, window.innerHeight - 160);
    menu.style.left = `${clampX}px`;
    menu.style.top = `${clampY}px`;
    menu.style.display = 'block';
  }

  private updateCameraImmediate() {
    const target = this.player ? this.player.position : new THREE.Vector3();
    const x = target.x + this.camDistance * Math.sin(this.camYaw) * Math.cos(this.camPitch);
    const y = target.y + this.camDistance * Math.sin(this.camPitch);
    const z = target.z + this.camDistance * Math.cos(this.camYaw) * Math.cos(this.camPitch);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
  }

  private smoothUpdateCamera() {
    this.camDistance = THREE.MathUtils.lerp(this.camDistance, this.targetCamDistance, 0.1);
    this.updateCameraImmediate();
  }

  private createTooltip() {
    const tip = document.createElement('div');
    tip.style.position = 'fixed';
    tip.style.padding = '4px 8px';
    tip.style.borderRadius = '4px';
    tip.style.background = 'rgba(20,23,28,0.9)';
    tip.style.color = '#e5e7eb';
    tip.style.font = "12px 'Segoe UI', Arial, sans-serif";
    tip.style.pointerEvents = 'none';
    tip.style.zIndex = '10001';
    tip.style.display = 'none';
    document.body.appendChild(tip);
    this.tooltipEl = tip;
  }

  private showTooltip(x: number, y: number, text: string) {
    if (!this.tooltipEl) return;
    this.tooltipEl.textContent = text;
    const clampX = Math.min(x + 12, window.innerWidth - 160);
    const clampY = Math.min(y + 12, window.innerHeight - 24);
    this.tooltipEl.style.left = `${clampX}px`;
    this.tooltipEl.style.top = `${clampY}px`;
    this.tooltipEl.style.display = 'block';
  }

  private hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
  }

  private showPathRing(at: THREE.Vector3) {
    if (this.pathRing) {
      this.scene.remove(this.pathRing);
      const geoPrev = (this.pathRing as any).geometry as THREE.BufferGeometry | undefined;
      const matPrev = (this.pathRing as any).material as THREE.Material | undefined;
      geoPrev?.dispose();
      matPrev?.dispose?.();
      this.pathRing = null;
    }
    // Create a thin outline circle (no filled disk) to avoid "shadow" look
    const segments = 64;
    const radius = 0.7;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    // Rotate to lay flat on ground
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
    const line = new THREE.LineLoop(geo, mat);
    line.position.set(at.x, 0.02, at.z);
    line.renderOrder = 2; // draw on top
    (mat as any).depthTest = false; // avoid z-fighting; treat like UI overlay
    this.scene.add(line);
    this.pathRing = line;
    this.pathRingLife = 0.8; // seconds
  }

  private flashObject(obj: THREE.Object3D) {
    const mesh = obj as THREE.Mesh;
    if (!mesh || !mesh.material) return;
    const mat = (mesh.material as any);
    const prev = mat.color ? mat.color.clone() : null;
    if (mat.color) mat.color.setHex(0xff5555);
    setTimeout(() => { if (mat.color && prev) mat.color.copy(prev); }, 200);
  }
}


