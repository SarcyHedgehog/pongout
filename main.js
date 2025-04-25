// main.js — Multisynq Synced Paddle Demo (Vanessa-style)

import * as THREE from 'three';
import { Model, View, Session } from '@multisynq/client';

class PongoutModel extends Model {
  init() {
    this.paddles = {}; // sessionId -> y position
    this.subscribe("paddleMove", this.handleMove);
  }

  handleMove(data, sender) {
    this.paddles[sender] = data.y;
    this.publish("paddleMoved", { sessionId: sender, y: data.y });
  }
}

class PongoutView extends View {
  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.camera.position.z = 20;

    this.paddles = {};
    this.myPaddle = this.createPaddle(-9, 0x00aaff);
    this.paddles[this.sessionId] = this.myPaddle;

    this.input = { up: false, down: false };
    document.addEventListener("keydown", e => this.key(e, true));
    document.addEventListener("keyup", e => this.key(e, false));

    this.subscribe("paddleMoved", data => this.updatePaddle(data));
    this.updateLoop();
  }

  createPaddle(x, color) {
    const geom = new THREE.BoxGeometry(0.5, 2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.x = x;
    this.scene.add(mesh);
    return mesh;
  }

  updatePaddle({ sessionId, y }) {
    if (!this.paddles[sessionId]) {
      this.paddles[sessionId] = this.createPaddle(9, 0xff6600);
    }
    this.paddles[sessionId].position.y = y;
  }

  key(e, isDown) {
    if (e.key === "ArrowUp") this.input.up = isDown;
    if (e.key === "ArrowDown") this.input.down = isDown;
  }

  updateLoop() {
    requestAnimationFrame(() => this.updateLoop());
    if (this.input.up) this.myPaddle.position.y += 0.2;
    if (this.input.down) this.myPaddle.position.y -= 0.2;
    this.publish("paddleMove", { y: this.myPaddle.position.y });
    this.renderer.render(this.scene, this.camera);
  }
}

// ✅ Register classes (this was the missing link)
//PongoutModel.register("PongoutModel");
//PongoutView.register("PongoutView");

// ✅ Start session after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  Session.join({
    apiKey: "2atXt6dTbNaKKO83iB4tsYDfmpusH0C6veTYXjy7Om",
    appId: "com.sarcastichedgehog.pongout3d",
    password: "pong3d",
    model: PongoutModel,
    view: PongoutView
  });
});

export { PongoutModel, PongoutView };
t
