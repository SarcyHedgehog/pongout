# 🧱 Pongout 3D - Current Development Status

This project is a Croquet-powered, Three.js-rendered 3D Pong + Breakout hybrid game, built using the @multisynq/client library for multiplayer state sync.

---

## ✅ Project Goals

- Two-player networked Pong x Breakout mashup
- Portal 2-inspired blue vs orange aesthetics
- Paddle sync via Multisynq (formerly Croquet)
- 3D ball and brick wall interactions
- Paddle shrinking on missed returns
- Game ends when opponent’s paddle is breached

---

## 🧠 Current State

We are encountering a blocking error that prevents the game from initializing properly in the browser:

```
Error: Model class "PongoutModel" not registered
```

Despite the following being in place:

- Using `@multisynq/client@1.0.0`
- No `.register()` calls (per updated usage pattern)
- Model and view classes defined and passed directly:
  ```js
  Session.join({ model: PongoutModel, view: PongoutView })
  ```
- Classes are exported:
  ```js
  export { PongoutModel, PongoutView }
  ```
- Code is housed in a single `main.js` file
- Project uses Vite (no React plugins)
- `.vite` cache cleared and reloaded
- Session opened in incognito tab

---

## 🔍 Suspected Causes

1. **Vite bundling behavior** — Multisynq may be trying to dynamically import `PongoutModel` by name and failing to resolve it due to Vite chunking.

2. **Multisynq internal model loader** — the runtime might not be discovering the class correctly in development mode.

3. **Hot Module Reload conflicts** — model might be missing due to race conditions or caching issues during HMR.

---

## 🧪 Next Steps

- [ ] Have a developer check if `PongoutModel` is correctly resolved in the module registry.
- [ ] Try disabling HMR entirely in Vite.
- [ ] Package and run from a static build (`vite build && serve dist`) to avoid dev-time quirks.
- [ ] Try registering model with an explicit string and see if classic Croquet registration still works as fallback.

---

## 📦 Repo Links

Current project code (main):
- https://github.com/SarcyHedgehog/pongout

Example we’re basing on:
- https://github.com/multisynq/vibe-coding-multisynq-threejs

Vanessa Freudenberg’s template (source of truth):
- https://github.com/croquet/multicar

---

## 🆘 Blocker Summary

We cannot currently instantiate or join a session using `@multisynq/client` because the model class is “not registered” — despite being defined and passed in correctly. This is likely an ESM or Vite bundling edge case.

---
