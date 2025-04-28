import * as THREE from "three";
import { Session, Model, View } from "@multisynq/client";

// Model definition
class PongoutModel extends Model {
  init() {
    console.log("✅ PongoutModel.init() called");
    this.players = new Map();
    this.balls = {
      orange: {
        x: -8,
        y: 0,
        vx: 0.1,
        vy: 0.1 * (Math.random() < 0.5 ? 1 : -1),
      },
      blue: {
        x: 8,
        y: 0,
        vx: -0.1,
        vy: 0.1 * (Math.random() < 0.5 ? 1 : -1),
      },
    };
    this.paddles = {
      orange: { x: -9, y: 0, height: 3 },
      blue: { x: 9, y: 0, height: 3 },
    };
    this.future(16).step();
  }

  step() {
    Object.entries(this.balls).forEach(([color, ball]) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.y > 10 || ball.y < -10) {
        ball.vy *= -1;
      }

      Object.entries(this.paddles).forEach(([paddleColor, paddle]) => {
        if (this.checkPaddleCollision(ball, paddle)) {
          ball.vx *= -1.1;
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
      ball.y >= paddle.y - paddle.height / 2 &&
      ball.y <= paddle.y + paddle.height / 2
    );
  }

  onViewJoin(viewId) {
    const isFirstPlayer = this.players.size === 0;
    const color = isFirstPlayer ? "orange" : "blue";
    this.players.set(viewId, { color });
    this.publish(this.id, "playerAssigned", { viewId, color });
  }

  movePaddle(viewId, dy) {
    const player = this.players.get(viewId);
    if (!player) return;

    const paddle = this.paddles[player.color];
    paddle.y = Math.max(-7, Math.min(7, paddle.y + dy));
  }
}
PongoutModel.register("PongoutModel");

// View definition
class PongoutView extends View {
  constructor(model) {
    super(model);
    console.log("✅ PongoutView.constructor() called");
    this.model = model;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    this.meshes = {};
    this.playerColor = null;

    // Subscribe to events
    this.subscribe(
      this.model.id,
      "playerAssigned",
      this.onPlayerAssigned.bind(this)
    );
    this.subscribe(
      this.model.id,
      "gameStateUpdate",
      this.updateGameState.bind(this)
    );

    // Add keyboard controls
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));

    this.createMeshes();
    this.updateLoop();
  }

  createMeshes() {
    const colors = {
      orange: 0xff6600,
      blue: 0x00a5ff,
    };

    Object.entries(colors).forEach(([colorName, colorValue]) => {
      // Ball
      const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const ballMaterial = new THREE.MeshStandardMaterial({
        color: colorValue,
        metalness: 0.3,
        roughness: 0.4,
        emissive: colorValue,
        emissiveIntensity: 0.5,
      });
      const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
      ballMesh.castShadow = true;
      this.scene.add(ballMesh);
      this.meshes[`${colorName}Ball`] = ballMesh;

      // Paddle
      const paddleGeometry = new THREE.BoxGeometry(0.5, 3, 0.5);
      const paddleMaterial = new THREE.MeshStandardMaterial({
        color: colorValue,
        metalness: 0.7,
        roughness: 0.3,
        emissive: colorValue,
        emissiveIntensity: 0.2,
      });
      const paddleMesh = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddleMesh.castShadow = true;
      this.scene.add(paddleMesh);
      this.meshes[`${colorName}Paddle`] = paddleMesh;
    });
  }

  onPlayerAssigned({ viewId, color }) {
    if (viewId === this.viewId) {
      this.playerColor = color;
      console.log(`✅ Assigned as ${color} player`);
    }
  }

  updateGameState(state) {
    Object.entries(state.balls).forEach(([color, ball]) => {
      const mesh = this.meshes[`${color}Ball`];
      if (mesh) {
        mesh.position.set(ball.x, ball.y, 0);
      }
    });

    Object.entries(state.paddles).forEach(([color, paddle]) => {
      const mesh = this.meshes[`${color}Paddle`];
      if (mesh) {
        mesh.position.set(paddle.x, paddle.y, 0);
      }
    });
  }

  handleKeyDown(e) {
    if (!this.playerColor) return;

    if (e.key === "ArrowUp") {
      this.model.movePaddle(this.viewId, 0.5);
    } else if (e.key === "ArrowDown") {
      this.model.movePaddle(this.viewId, -0.5);
    }
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateLoop() {
    requestAnimationFrame(() => this.updateLoop());
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  detach() {
    if (this.renderer) {
      this.renderer.dispose();
      document.body.removeChild(this.renderer.domElement);
    }
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);
    super.detach();
  }
}

// Session initialization
window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ DOMContentLoaded event fired");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("s");

    const session = await Session.join({
      apiKey: "2atXt6dTbNaKKO83iB4tsYDfmpusH0C6veTYXjy7Om",
      appId: "com.sarcastichedgehog.pongout3d",
      name: "pongout3d",
      password: "pong3d",
      model: PongoutModel,
      sessionId: sessionId,
    });

    console.log("🎉 Successfully joined session:", session);

    if (!sessionId) {
      const newUrl = `${window.location.pathname}?s=${session.id}`;
      window.history.pushState({ sessionId: session.id }, "", newUrl);
    }

    const view = new PongoutView(session.model);
    session.view = view;
  } catch (err) {
    console.error("❌ Failed to join session", err);
  }
});
