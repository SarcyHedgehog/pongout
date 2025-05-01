import * as THREE from "three";
import { Session, Model, View } from "@multisynq/client";

class PongoutModel extends Model {
  init() {
    console.log("✅ Model initialized");
    this.players = new Map();

    // Initialize balls
    this.balls = {
      orange: { x: -20, y: 0, vx: 0.15, vy: 0.15 },
      blue: { x: 20, y: 0, vx: -0.15, vy: -0.15 },
    };

    // Initialize paddles
    this.paddles = {
      orange: { x: -25, y: 0, height: 6 },
      blue: { x: 25, y: 0, height: 6 },
    };

    // Start game loop
    this.future(16).step();
  }

  step() {
    // Update ball positions
    Object.values(this.balls).forEach((ball) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Ball-wall collisions
      if (Math.abs(ball.y) > 12) {
        ball.vy *= -1;
        ball.y = Math.sign(ball.y) * 12;
      }

      // Ball-paddle collisions
      Object.entries(this.paddles).forEach(([color, paddle]) => {
        if (this.checkPaddleCollision(ball, paddle)) {
          console.log(`🏓 ${color} ball hit ${color} paddle`);
          ball.vx *= -1;
          ball.x = paddle.x + Math.sign(ball.vx) * 1;
        }
      });
    });

    // Model publishes with its ID
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
    if (!player) return;

    const paddle = this.paddles[player.color];
    paddle.y = Math.max(-12, Math.min(12, paddle.y + dy));

    // Model publishes with its ID
    this.publish(this.id, "gameStateUpdate", {
      balls: this.balls,
      paddles: this.paddles,
    });
  }

  onViewJoin(viewId) {
    console.log("👋 View joining:", viewId);
    const color = this.players.size === 0 ? "orange" : "blue";
    this.players.set(viewId, { color });

    // Model publishes with its ID
    this.publish(this.id, "playerAssigned", { viewId, color });
  }
}
PongoutModel.register("PongoutModel");

class PongoutView extends View {
  constructor(model) {
    super(model);
    this.model = model; // Store model reference

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 40;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);

    // Game objects
    this.meshes = {};
    this.playerColor = null;
    this.createMeshes();

    // Controls
    this.keys = { ArrowUp: false, ArrowDown: false };
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));

    // Subscribe with model ID
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

    // Start rendering
    this.animate();
    console.log("✅ View initialized");
  }

  createMeshes() {
    // Add board first
    const boardGeo = new THREE.PlaneGeometry(52, 30);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.z = -1;
    this.scene.add(board);

    // Create paddles and balls
    const colors = { orange: 0xff6600, blue: 0x00a5ff };
    Object.entries(colors).forEach(([colorName, colorValue]) => {
      // Ball
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

      // Paddle
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

  handleKeyDown(e) {
    if (!this.playerColor || !this.model) return;

    if (e.key in this.keys && !this.keys[e.key]) {
      this.keys[e.key] = true;
      const dy = e.key === "ArrowUp" ? 0.5 : e.key === "ArrowDown" ? -0.5 : 0;
      if (dy !== 0) {
        this.model.movePaddle(this.viewId, dy);
      }
    }
  }

  handleKeyUp(e) {
    if (e.key in this.keys) {
      this.keys[e.key] = false;
    }
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
      }
    });
  }
}

// Session setup
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId =
      urlParams.get("s") || Math.random().toString(36).substring(2);

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
    });
    const view = new PongoutView(session.model);
    session.view = view;
    console.log("🎮 View registered:", { viewId: view.viewId });
  } catch (err) {
    console.error("❌ Failed to join session:", err);
  }
});
