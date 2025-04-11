# Pongout 3D (Multisynq + Three.js)

This project is a multiplayer 3D Pong-style game built using:

- **Multisynq/Croquet** for real-time multiplayer state synchronization.
- **Three.js** for WebGL-based 3D rendering.
- **Vite** as the development server and build tool.

---

## 🚀 What's New

### ✅ Moved to Three.js
We migrated from the original HTML canvas-based rendering to a 3D setup using **Three.js**. This allows for:
- Smooth paddle animations
- Flexible camera control
- Easy future upgrades: 3D ball, lighting, particles, and effects

### ✅ Multiplayer Synchronization
Each player controls their own paddle using `mousemove`.
- Blue paddle (Player 1) appears on the **left**
- Orange paddle (Player 2) appears on the **right**
- Paddle positions are synchronized across both views in real-time using Croquet sessions
- Only the owning player can move their assigned paddle (based on `viewId`)

---

## 🔧 Development Setup

```bash
npm install
npm run dev
```

Ensure your environment includes:
- Node.js
- Working internet connection for loading `three` and `@croquet/croquet` modules

---

## ✅ Working Features
- Multiplayer session handling
- Paddle control with mouse
- Distinct control ownership for each player
- Live synchronization of paddle movement
- WebGL-based rendering with colored materials and shadows

---

## 🧱 Next Steps
- Add ball logic: bouncing, collisions, reset
- Add bricks or targets
- Add scoring and game loop
- Apply Portal 2-themed colors and polish materials

---

## 🎮 Tech Stack
| Feature         | Library         |
|----------------|-----------------|
| Multiplayer     | Multisynq/Croquet |
| 3D Graphics     | Three.js        |
| Dev Server      | Vite            |
| Language        | JavaScript (ES modules)

---

## 🧠 Learnings
- Croquet automatically assigns `viewId`; don’t try to overwrite it manually.
- Do not use `Croquet.Constants.set()` — instead, assign constants directly.
- `viewId` should be used to determine player ownership, but never modified.
- Use `Croquet.Model.register()` for models but **not** for views.

---

## 📂 File Structure
```bash
pongout-game/
├── index.html
├── pong3d.js        # Main game logic
├── README.md        # You're reading it
├── vite.config.js
├── package.json
└── node_modules/
```

---

## ✍️ Author
James Poole & Harper (AI Pair Dev 🤖)

---

## 🔗 Related
- https://github.com/multisynq/vibe-coding-multisynq-threejs
- https://croquet.io
- https://threejs.org

