# Product Requirements Document (PRD)

## Project Title
**Runeskibidi** (Working Title)

## Vision Statement
Create a classic-style sandbox MMO that captures the essence of Old School RuneScape (OSRS) with modern conveniences: a persistent low‑poly 3D world with deep crafting, trading, player-driven economy, and roleplay, built as a JavaScript web application for universal accessibility and rapid development.

## Core Gameplay Features
- **Open World (3D):** Low‑poly 3D world with multiple connected areas/zones. Dungeons and PvP arenas can be separate scenes/instances.
- **Camera & Controls:** OSRS‑style third‑person camera with orbit/zoom and a slightly tilted isometric framing. Primary input is left‑click to move/interact using ground raycasts and pathfinding; optional WASD autorun/strafe toggle.
- **Hotbar:** 8‑slot hotbar (QWER1234 by default, customizable).
- **Health & Mana:** Classic MMO resource bars.
- **Skills:** Gathering (mining, fishing, woodcutting, etc.), crafting, and combat skills. Tick‑based progression/combat targeting ~600ms global tick (configurable).
- **Inventory:** RuneScape‑style grid inventory system.
- **Crafting & Trading:** Deep crafting system, player shops, and trading mechanics. Players can open shops and trade items.
- **Roleplay:** Character customization through equipment and clothing. Basic housing system.
- **Group Content:** Support for group activities and basic events.

## World Building & Rendering
- **Scene-Based World:** Scene management for different areas/zones with seamless transitions where possible.
- **Chunked Terrain & Props:** Low‑poly 3D terrain and props organized in chunks for streaming and culling. Heightmaps or modular tiles for ground; navmesh per chunk.
- **Resource Spawning:** Respawning resource nodes (trees, rocks, fishing spots) with timers and randomized placement/loot tables.
- **Graphics Rendering:** WebGL2 via a lightweight 3D engine (Three.js or Babylon.js). Use instancing, batching, LODs, and frustum culling to keep draw calls low.
- **Asset Pipeline:** Import models via glTF 2.0; prefer atlased textures, vertex colors, and baked AO to keep materials simple. Meshopt/gltfpack for compression.

## Server Architecture & Networking
- **Supabase Backend:** Use Supabase as Backend‑as‑a‑Service for database, authentication, and real‑time features.
- **Client‑Server Model:** JavaScript web clients communicate with Supabase via REST API and real‑time subscriptions.
- **Real‑time Updates:** Use subscriptions for player positions, chat, and world events. Apply client‑side interpolation and tick alignment for smooth 3D movement.
- **Database Integration:** PostgreSQL via Supabase with built‑in Row Level Security (RLS) for data protection.
- **Authentication:** Supabase Auth for user registration, login, and session management.
- **Security:** Server‑side validation through Supabase RLS policies and database triggers.

## Scalability & Live Ops
- **Configuration Files:** Use JSON files for easy content updates without redeployment.
- **External Admin Tools:** Web-based admin panel for managing players, items, and server events.
- **CDN Integration:** Supabase Storage for static assets (sprites, sounds, data files).

## Gameplay & Social Systems
- **Event System:** Custom event system for world events, quests, and player interactions.
- **Economy System:** Item database with supply/demand mechanics for player trading.
- **Basic Social Features:** Chat system, friend lists, and guild functionality.

## Technical Requirements
- **Frontend Framework:** Vanilla JavaScript with a lightweight 3D engine (Three.js preferred; Babylon.js acceptable)
- **Graphics:** Low‑poly 3D, toon‑adjacent shading, simple materials; WebGL2 rendering
- **Scripting:** Modern JavaScript (ES6+) with async/await for game logic
- **Platform:** Web browsers (Chrome, Firefox, Safari, Edge) — responsive design for desktop and mobile
- **Database:** Supabase PostgreSQL (development and production)
- **Backend Technology:**
  - Supabase Backend‑as‑a‑Service
  - HTTP/HTTPS via Supabase REST API
  - Real‑time subscriptions via Supabase WebSocket connections
  - Built‑in authentication and authorization
- **Development Tools:**
  - Vite for bundling and dev server
  - Package manager (npm or yarn)
  - Code splitting and minification
  - Hot reload for development
- **Assets:** glTF 2.0 models, atlased textures (PNG/WebP), JSON configs, simple shader chunks

## Development Roadmap
### Phase 1: Core Foundation (3D)
- Set up project with Vite and Three.js/Babylon.js
- Implement third‑person OSRS‑style camera (orbit/zoom, tilt clamp)
- Raycast‑based left‑click to move; basic A* on simple navmesh/waypoints
- Load glTF character and play basic idle/walk/run animations
- Basic UI framework (inventory, hotbar, menus) with HTML/CSS

### Phase 2: World & Interaction
- Chunked terrain prototype (heightmap or modular tiles)
- Frustum culling, simple LODs, and hardware instancing for props
- Resource nodes (trees/rocks/fishing spots) with respawn timers
- Simple interaction system via raycast hits (ground, NPCs, objects)

### Phase 3: Networking & Persistence
- Set up Supabase project and database schema
- Implement registration/login via Supabase Auth
- Real‑time player sync with interpolation and tick alignment
- Cloud save/load for inventory, equipment, and stats
- Real‑time chat

### Phase 4: Economy & Social Systems
- Inventory and item system across equipment and backpack
- Player trading and shops/market stalls
- Basic guild/group system
- Additional skills and crafting recipes
- Basic quest scaffolding

### Phase 5: Polish & Content
- Expand areas and add content
- Improve animations, blend spaces, and camera feel
- Balance gameplay systems
- Web Audio API sound effects and music
- Basic anti‑cheat measures
- Mobile performance optimization

## MVP (Minimum Viable Product)
- Single 3D area with click‑to‑move, camera orbit/zoom, and interaction
- Working inventory and item system with equipment visuals (basic swaps)
- One or two gathering skills (mining, woodcutting) using 3D nodes
- Basic crafting with 5–10 recipes
- Cloud save/load via Supabase
- Simple combat against NPCs (click‑to‑attack with tick cadence)
- Responsive UI for core systems
- Playable on desktop and mobile browsers with low‑poly settings

## Technical Limitations & Considerations
- **Player Limit:** Target 100–200 concurrent players maximum given browser/WebGL limits and Supabase real‑time throughput
- **World Size:** Multiple connected scenes/chunks loaded on demand rather than a single massive world
- **Real‑time Features:** Only essentials; client‑side interpolation and server validation to reduce bandwidth
- **Graphics:** WebGL2 low‑poly rendering, optimized for 60 FPS via instancing, LODs, and careful material count
- **Performance:** Minimize draw calls, texture switches, and JS GC pressure; prefer batched updates on a global tick
- **Mobile Optimization:** Lower LODs, reduced shadows, smaller texture atlases, and optional 30 FPS cap

## Browser Compatibility
- **Minimum Requirements:**
  - Chrome 79+, Firefox 72+, Safari 14+, Edge 79+
  - WebGL2 and WebSocket support
  - Local Storage/IndexedDB for client‑side caching
  - ES6+ JavaScript features

## External Tools & Services Needed
- **Backend Service:** Supabase (free tier available, scales with usage)
- **Database:** PostgreSQL via Supabase (included)
- **Admin Panel:** Supabase Dashboard for database management
- **Analytics:** Supabase built‑in analytics + custom event tracking
- **CDN:** Supabase Storage for game assets
- **Art Pipeline:** Blender for low‑poly modeling and glTF export; meshoptimizer/gltfpack for compression
- **Development Tools:**
  - Code editor (VS Code recommended)
  - Browser dev tools for debugging
  - Git for version control

## Deployment & Hosting
- **Static Hosting:** Vercel, Netlify, or Supabase hosting for the frontend
- **Domain:** Custom domain with HTTPS
- **CI/CD:** Automated deployment pipeline
- **Environment Management:** Separate development, staging, and production environments

## Future Considerations
- Progressive Web App (PWA) features for offline capability
- Advanced rendering features: cascaded shadows, SSAO‑lite, baked lightmaps
- Occlusion and impostors for dense scenes; terrain/prop streaming
- Integration with Web APIs (Gamepad, optional gyro camera on mobile)
- Expanded world with more areas and content
- Advanced social features and guild systems
- Integration with Discord or other social platforms
- Potential mobile app versions using web technologies (Capacitor/Cordova)

---

**This PRD is a living document and will evolve as development progresses.** 