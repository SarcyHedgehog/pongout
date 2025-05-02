import * as THREE from "three";
import { Session, Model, View } from "@multisynq/client";

class PongoutModel extends Model {
  init() {
    console.log("✅ Model initialized");
    this.players = new Map();
    this.gameStarted = false;

    this.balls = {
      orange: {
        x: -20,
        y: 0,
        vx: 0.15,
        vy: 0.15,
      },
      blue: {
        x: 20,
        y: 0,
        vx: -0.15,
        vy: -0.15,
      },
    };

    this.paddles = {
      orange: { x: -32, y: 0, height: 6, velocity: 0 },
      blue: { x: 32, y: 0, height: 6, velocity: 0 },
    };

    this.future(16).step();
  }

  step() {
    Object.entries(this.balls).forEach(([color, ball]) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (Math.abs(ball.y) > 18) {
        ball.vy *= -1;
        ball.y = Math.sign(ball.y) * 18;
      }

      if (Math.abs(ball.x) > 34) {
        ball.vx *= -1;
        ball.x = Math.sign(ball.x) * 34;
      }

      Object.entries(this.paddles).forEach(([paddleColor, paddle]) => {
        if (this.checkPaddleCollision(ball, paddle)) {
          console.log(`🏓 ${color} ball hit ${paddleColor} paddle`);
          ball.vx *= -1;
          ball.x = paddle.x + Math.sign(ball.vx) * 1;
          ball.vy += paddle.velocity * 0.5;
        }
      });
    });

    this.publish(this.id, "gameStateUpdate", {
      balls: this.balls,
      paddles: this.paddles,
    });

    this.future(16).step();
  }

  checkPaddleCollision(ball, paddle) {
    return (
      Math.abs(ball.x - paddle.x) < 1 &&
      Math.abs(ball.y - paddle.y) < paddle.height / 2
    );
  }

  movePaddle(viewId, dy) {
    const player = this.players.get(viewId);
    if (!player) {
      console.warn("⚠️ No player found:", viewId, "- Possible causes:", {
        totalPlayers: this.players.size,
        activePlayers: Array.from(this.players.keys()),
        requestingViewId: viewId,
      });
      return;
    }

    const paddle = this.paddles[player.color];
    if (!paddle) {
      console.error("❌ Invalid paddle color:", player.color);
      return;
    }

    const prevY = paddle.y;
    paddle.y = Math.max(-18, Math.min(18, paddle.y + dy));
    paddle.velocity = paddle.y - prevY;

    console.log("🎮 Moving paddle:", {
      color: player.color,
      y: paddle.y,
      velocity: paddle.velocity,
      viewId: viewId,
    });

    this.publish(this.id, "gameStateUpdate", {
      balls: this.balls,
      paddles: this.paddles,
    });
  }

  onViewJoin(viewId) {
    console.log("👋 View joining:", viewId);
    // Assign player color
    const color = this.players.size === 0 ? "orange" : "blue";

    // Store player data
    this.players.set(viewId, { color });
    console.log("🎮 Player assigned:", {
      viewId,
      color,
      totalPlayers: this.players.size,
    });

    // Start game loop if not already running
    if (!this.gameStarted) {
      this.gameStarted = true;
      this.future(16).step();
    }

    // Send player assignment FIRST
    this.publish(this.id, "playerAssigned", {
      viewId,
      color,
    });

    // THEN send initial game state
    this.publish(this.id, "gameStateUpdate", {
      balls: this.balls,
      paddles: this.paddles,
    });

    console.log("🎲 Initial state sent:", {
      paddles: this.paddles,
      viewId,
      color,
    });
  }
}

PongoutModel.register("PongoutModel");

class InputController {
  constructor(view) {
    this.view = view;
    this.model = view.model;
    this.viewId = view.viewId;
    this.active = false;
    this.keys = { ArrowUp: false, ArrowDown: false };

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));

    this.update();
    console.log("🎮 Input controller created for:", this.viewId);
  }

  activate() {
    this.active = true;
    console.log("🎮 Input controller activated for player:", this.viewId);
  }

  handleKeyDown(e) {
    if (e.key in this.keys && !this.keys[e.key]) {
      this.keys[e.key] = true;
      e.preventDefault();
      console.log("⌨️ Key down:", e.key);
    }
  }

  handleKeyUp(e) {
    if (e.key in this.keys) {
      this.keys[e.key] = false;
      e.preventDefault();
      console.log("⌨️ Key up:", e.key);
    }
  }

  update() {
    if (this.model && this.viewId && this.active) {
      if (this.keys.ArrowUp) {
        console.log("⬆️ Moving paddle up");
        this.model.movePaddle(this.viewId, 0.5);
      }
      if (this.keys.ArrowDown) {
        console.log("⬇️ Moving paddle down");
        this.model.movePaddle(this.viewId, -0.5);
      }
    }
    requestAnimationFrame(() => this.update());
  }
}

class PongoutView extends View {
  constructor(model) {
    super(model);
    this.model = model;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);

    this.meshes = {};
    this.playerColor = null;
    this.createMeshes();

    this.input = new InputController(this);

    window.addEventListener("resize", this.handleResize.bind(this));
    this.subscribe(
      model.id,
      "playerAssigned",
      this.onPlayerAssigned.bind(this)
    );
    this.subscribe(
      model.id,
      "gameStateUpdate",
      this.updateGameState.bind(this)
    );

    this.animate();
    console.log("✅ View initialized");
  }

  createMeshes() {
    const boardGeo = new THREE.PlaneGeometry(70, 40);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.2,
      roughness: 0.8,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.z = -1;
    this.scene.add(board);

    const colors = { orange: 0xff6600, blue: 0x00a5ff };

    Object.entries(colors).forEach(([colorName, colorValue]) => {
      const ballGeo = new THREE.SphereGeometry(0.5, 32, 32);
      const ballMat = new THREE.MeshStandardMaterial({
        color: colorValue,
        metalness: 0.8,
        roughness: 0.2,
        emissive: colorValue,
        emissiveIntensity: 0.5,
      });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      this.scene.add(ball);
      this.meshes[`${colorName}Ball`] = ball;

      const paddleGeo = new THREE.BoxGeometry(0.5, 6, 1);
      const paddleMat = new THREE.MeshStandardMaterial({
        color: colorValue,
        metalness: 0.9,
        roughness: 0.1,
        emissive: colorValue,
        emissiveIntensity: 0.3,
      });
      const paddle = new THREE.Mesh(paddleGeo, paddleMat);
      this.scene.add(paddle);
      this.meshes[`${colorName}Paddle`] = paddle;
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onPlayerAssigned(data) {
    if (data.viewId === this.viewId) {
      console.log("🎮 Assigned color:", data.color);
      this.playerColor = data.color;
      this.input.activate();
    }
  }

  updateGameState(state) {
    Object.entries(state.balls).forEach(([color, ball]) => {
      const mesh = this.meshes[`${color}Ball`];
      if (mesh) {
        mesh.position.x = ball.x;
        mesh.position.y = ball.y;
      }
    });

    Object.entries(state.paddles).forEach(([color, paddle]) => {
      const mesh = this.meshes[`${color}Paddle`];
      if (mesh) {
        mesh.position.x = paddle.x;
        mesh.position.y = paddle.y;

        // Flash paddle when it moves
        if (color === this.playerColor && paddle.velocity !== 0) {
          mesh.material.emissiveIntensity = 0.8;
          setTimeout(() => {
            mesh.material.emissiveIntensity = 0.3;
          }, 100);
        }
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId =
      urlParams.get("s") || Math.random().toString(36).substring(2);

    if (!urlParams.get("s")) {
      const newUrl = `${window.location.pathname}?s=${sessionId}`;
      window.history.pushState({ sessionId }, "", newUrl);
    }

    console.log("🔄 Joining session...", { sessionId });
    const session = await Session.join({
      apiKey: "2atXt6dTbNaKKO83iB4tsYDfmpusH0C6veTYXjy7Om",
      appId: "com.sarcastichedgehog.pongout3d",
      name: "pongout3d",
      password: "pong3d",
      model: PongoutModel,
      sessionId: sessionId,
    });

    console.log("🎉 Session joined:", {
      id: session.id,
      modelId: session.model.id,
      sessionId: sessionId,
    });

    const view = new PongoutView(session.model);
    session.view = view;

    console.log("🎮 View registered:", {
      viewId: view.viewId,
      sessionId: sessionId,
    });
  } catch (err) {
    console.error("❌ Failed to join session:", err);
  }
});
