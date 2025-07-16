# Product Requirements Document (PRD)

## Project Title
**Runeskibidi** (Working Title)

## Vision Statement
Create a classic-style sandbox MMO that captures the essence of early RuneScape with modern conveniences: a persistent 2D world with deep crafting, trading, player-driven economy, and roleplay, built as a JavaScript web application for universal accessibility and rapid development.

## Core Gameplay Features
- **Open World:** 2D top-down world with multiple connected areas/zones. Dungeons and PvP arenas can be separate scenes.
- **Camera & Controls:** Top-down 2D camera with zoom functionality. Left-click to move and interact (classic MMO style).
- **Hotbar:** 8-slot hotbar (QWER1234 by default, customizable).
- **Health & Mana:** Classic MMO resource bars.
- **Skills:** Basic gathering (mining, fishing, woodcutting, etc.), crafting, and combat skills. Tick-based progression and combat (e.g., 600ms global tick).
- **Inventory:** RuneScape-style grid inventory system.
- **Crafting & Trading:** Deep crafting system, player shops, and trading mechanics. Players can open shops and trade items.
- **Roleplay:** Character customization through equipment and clothing. Basic housing system.
- **Group Content:** Support for group activities and basic events.

## World Building & Rendering
- **Scene-Based World:** Use JavaScript scene management for different areas/zones with smooth transitions.
- **Tile-Based Design:** Custom tile rendering system using HTML5 Canvas for efficient world building and collision detection.
- **Resource Spawning:** Implement respawning resource nodes (trees, rocks, fishing spots) with timers and randomization.
- **Graphics Rendering:** HTML5 Canvas 2D API for sprite rendering, animations, and UI elements.

## Server Architecture & Networking
- **Supabase Backend:** Use Supabase as Backend-as-a-Service for database, authentication, and real-time features.
- **Client-Server Model:** JavaScript web clients communicate with Supabase via REST API and real-time subscriptions.
- **Real-time Updates:** Leverage Supabase's real-time subscriptions for live player positions, chat, and world events.
- **Database Integration:** PostgreSQL via Supabase with built-in Row Level Security (RLS) for data protection.
- **Authentication:** Supabase Auth for user registration, login, and session management.
- **Security:** Server-side validation through Supabase RLS policies and database triggers.

## Scalability & Live Ops
- **Configuration Files:** Use JSON files for easy content updates without redeployment.
- **External Admin Tools:** Web-based admin panel for managing players, items, and server events.
- **CDN Integration:** Supabase Storage for static assets (sprites, sounds, data files).

## Gameplay & Social Systems
- **Event System:** Custom event system for world events, quests, and player interactions.
- **Economy System:** Item database with supply/demand mechanics for player trading.
- **Basic Social Features:** Chat system, friend lists, and guild functionality.

## Technical Requirements
- **Frontend Framework:** Vanilla JavaScript or lightweight framework (Phaser.js for game engine features)
- **Graphics:** 2D sprite-based graphics with pixel art or clean vector style
- **Scripting:** Modern JavaScript (ES6+) with async/await for all game logic
- **Platform:** Web browsers (Chrome, Firefox, Safari, Edge) - responsive design for desktop and mobile
- **Database:** Supabase PostgreSQL (development and production)
- **Backend Technology:**
  - Supabase Backend-as-a-Service
  - HTTP/HTTPS communication via Supabase REST API
  - Real-time subscriptions via Supabase WebSocket connections
  - Built-in authentication and authorization
- **Development Tools:**
  - Modern build tools (Vite, Webpack, or Parcel)
  - Package manager (npm or yarn)
  - Code bundling and minification
  - Hot reload for development
- **Assets:** Custom pixel art, free/open web-compatible assets (PNG, SVG, JSON)

## Development Roadmap
### Phase 1: Core Foundation
- Set up JavaScript project structure with build tools
- Implement basic player movement and camera system using Canvas API
- Create tile-based world rendering with collision detection
- Build basic UI framework (inventory, hotbar, menus) with HTML/CSS
- Set up sprite animation system for character movement

### Phase 2: Basic MMO Features
- Implement inventory and item system
- Add gathering skills (mining, woodcutting, fishing)
- Create basic crafting system
- Build simple combat system (click-to-attack)
- Add health/mana management with animated UI

### Phase 3: Networking & Persistence
- Set up Supabase project and database schema
- Implement player registration and login via Supabase Auth
- Add real-time player synchronization using Supabase subscriptions
- Create cloud save/load system with Supabase database
- Add real-time chat functionality

### Phase 4: Economy & Social Systems
- Implement player trading system
- Add player shops and market functionality
- Create basic guild/group system
- Add more skills and crafting recipes
- Implement basic quest system

### Phase 5: Polish & Content
- Add more areas and content
- Improve graphics and animations
- Balance gameplay systems
- Add Web Audio API sound effects and music
- Implement basic anti-cheat measures
- Optimize for mobile browsers

## MVP (Minimum Viable Product)
- Single area with basic movement and interaction
- Working inventory and item system
- One or two gathering skills (mining, woodcutting)
- Basic crafting with 5-10 recipes
- Cloud save/load functionality via Supabase
- Simple combat against NPC enemies
- Basic responsive UI for all core systems
- Playable on desktop and mobile browsers

## Technical Limitations & Considerations
- **Player Limit:** Target 100-200 concurrent players maximum due to browser performance and Supabase real-time limits
- **World Size:** Multiple connected scenes rather than single massive world
- **Real-time Features:** Limited to essential features due to networking constraints and browser performance
- **Graphics:** 2D Canvas-based rendering, optimized for 60 FPS
- **Performance:** Optimize for smooth gameplay across various devices and browsers
- **Mobile Optimization:** Touch-friendly controls and responsive UI design

## Browser Compatibility
- **Minimum Requirements:**
  - Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
  - HTML5 Canvas and WebSocket support
  - Local Storage for client-side caching
  - Support for ES6+ JavaScript features

## External Tools & Services Needed
- **Backend Service:** Supabase (free tier available, scales with usage)
- **Database:** PostgreSQL via Supabase (included)
- **Admin Panel:** Supabase Dashboard for database management
- **Analytics:** Supabase built-in analytics + custom event tracking
- **CDN:** Supabase Storage for game assets
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
- WebGL rendering for enhanced performance
- Integration with Web APIs (Gamepad, VR, etc.)
- Expanded world with more areas and content
- Advanced social features and guild systems
- Integration with Discord or other social platforms
- Potential mobile app versions using web technologies (Capacitor/Cordova)

---

**This PRD is a living document and will evolve as development progresses.** 