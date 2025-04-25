import * as THREE from "three";
import { Model, View, Session, Constants } from "@multisynq/client";

const C = Constants;
C.paddleSpeed = 0.2;
C.paddleWidth = 0.5;
C.paddleHeight = 2;

class PongoutModel extends Model {
    init() {
        this.paddles = {}; // sessionId -> y
        this.subscribe("paddleMove", this.handleMove);
    }

    handleMove(data, meta) {
        this.paddles[meta.sessionId] = data.y;
        this.publish("paddleMoved", { sessionId: meta.sessionId, y: data.y });
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
        this.myPaddle = this.createPaddle(-9, this.viewId);
        this.paddles[this.viewId] = this.myPaddle;

        this.input = { up: false, down: false };
        window.addEventListener("keydown", e => this.key(e, true));
        window.addEventListener("keyup", e => this.key(e, false));

        this.subscribe("paddleMoved", data => this.updatePaddle(data));
        this.updateLoop();
    }

    createPaddle(x, id) {
        const geom = new THREE.BoxGeometry(C.paddleWidth, C.paddleHeight, 0.2);
        const mat = new THREE.MeshBasicMaterial({ color: id === this.viewId ? 0x00aaff : 0xff6600 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.x = x;
        this.scene.add(mesh);
        return mesh;
    }

    updatePaddle({ sessionId, y }) {
        if (!this.paddles[sessionId]) {
            this.paddles[sessionId] = this.createPaddle(9, sessionId);
        }
        this.paddles[sessionId].position.y = y;
    }

    key(e, isDown) {
        if (e.key === "ArrowUp") this.input.up = isDown;
        if (e.key === "ArrowDown") this.input.down = isDown;
    }

    updateLoop() {
        requestAnimationFrame(() => this.updateLoop());
        if (this.input.up) this.myPaddle.position.y += C.paddleSpeed;
        if (this.input.down) this.myPaddle.position.y -= C.paddleSpeed;
        this.publish("paddleMove", { y: this.myPaddle.position.y });
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    try {
        const session = await Session.join({
            apiKey: "2atXt6dTbNaKKO83iB4tsYDfmpusH0C6veTYXjy7Om",
            appId: "com.sarcastichedgehog.pongout3d",
            name: "pongout3d",
            password: "pong3d",
            model: PongoutModel,
            view: PongoutView
        });

        console.log("✅ Session joined", session);
    } catch (error) {
        console.error("❌ Error joining session:", error);
    }
});

export { PongoutModel, PongoutView };
