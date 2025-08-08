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

  constructor() {
    this.clock = new THREE.Clock();
  }

  static async create(container: HTMLElement): Promise<Game3D> {
    const game = new Game3D();
    game.container = container;
    game.initRenderer();
    game.initScene();
    game.initCamera();
    game.initLights();
    game.initGround();
    game.initPlayer();
    game.bindEvents();
    // Ensure camera positioned relative to player
    game.updateCameraImmediate();
    game.animate();
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

  private bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderer.domElement.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const sy = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointer.set(sx, sy);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      const groundHit = hits.find((h: THREE.Intersection) => (h.object as THREE.Object3D).name === 'GROUND');
      const firstNonGround = hits.find((h: THREE.Intersection) => (h.object as THREE.Object3D).name !== 'GROUND');

      // LMB: Move
      if (e.button === 0) {
        if (groundHit) {
          const point = groundHit.point.clone();
          point.y = 1;
          this.targetPosition = point;
        }
      }

      // RMB: Interact/attack or context when Shift held
      if (e.button === 2) {
        if ((e as MouseEvent).shiftKey) {
          // Shift+RMB: open context menu
          this.showContextMenu(e.clientX, e.clientY, groundHit?.point || null);
        } else {
          if (firstNonGround) {
            // Interact: move to hit point and log action (placeholder)
            const p = firstNonGround.point.clone();
            p.y = 1;
            this.targetPosition = p;
            console.log('Interact/Attack target:', (firstNonGround.object as THREE.Object3D).name || firstNonGround.object.uuid);
          } else if (groundHit) {
            const p = groundHit.point.clone();
            p.y = 1;
            this.targetPosition = p;
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
      // Only allow context menu when Shift is held, otherwise prevent default
      if (!(e as MouseEvent).shiftKey) {
        e.preventDefault();
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
  }

  private animate = () => {
    const delta = this.clock.getDelta();
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };

  // Placeholder to satisfy Shift+RMB context usage; implement full menu later
  private showContextMenu(_x: number, _y: number, _point: THREE.Vector3 | null) {
    console.log('Context menu at', _x, _y, 'point:', _point);
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
}


