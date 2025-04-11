// pong3d.js

import * as THREE from "three";
import { Model, View, Session, App } from "@croquet/croquet";

// Constants
const LEFT_COLOR = 0x00bfff;  // Portal 2 blue
const RIGHT_COLOR = 0xffa500; // Portal 2 orange
const PADDLE_WIDTH = 0.5;
const PADDLE_HEIGHT = 3;

// --- Model ---
class GameModel extends Model {
    init() {
        this.leftPaddle = { y: 0.5, ownerId: null };
        this.rightPaddle = { y: 0.5, ownerId: null };

        this.subscribe("view", "register", this.registerPlayer);
        this.subscribe("paddle", "move", this.movePaddle);
    }

    registerPlayer(viewId) {
        if (!this.leftPaddle.ownerId) {
            this.leftPaddle.ownerId = viewId;
        } else if (!this.rightPaddle.ownerId) {
            this.rightPaddle.ownerId = viewId;
        }
        this.publish("model", "updatePaddles", {
            left: this.leftPaddle,
            right: this.rightPaddle
        });
    }

    movePaddle({ viewId, y }) {
        if (viewId === this.leftPaddle.ownerId) {
            this.leftPaddle.y = y;
        } else if (viewId === this.rightPaddle.ownerId) {
            this.rightPaddle.y = y;
        }
        this.publish("model", "updatePaddles", {
            left: this.leftPaddle,
            right: this.rightPaddle
        });
    }
}
GameModel.register("GameModel");

// --- View ---
class GameView extends View {
    constructor(model) {
        super(model);
        this.model = model;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Create paddles
        const geometry = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, 0.2);
        const leftMaterial = new THREE.MeshBasicMaterial({ color: LEFT_COLOR });
        const rightMaterial = new THREE.MeshBasicMaterial({ color: RIGHT_COLOR });

        this.leftPaddleMesh = new THREE.Mesh(geometry, leftMaterial);
        this.rightPaddleMesh = new THREE.Mesh(geometry, rightMaterial);

        this.leftPaddleMesh.position.x = -5;
        this.rightPaddleMesh.position.x = 5;

        this.scene.add(this.leftPaddleMesh);
        this.scene.add(this.rightPaddleMesh);

        this.subscribe("model", "updatePaddles", this.updatePaddles);
        this.publish("view", "register", this.viewId);

        document.addEventListener("mousemove", (e) => {
            const normalizedY = 1 - e.clientY / window.innerHeight; // flip Y
            this.publish("paddle", "move", { viewId: this.viewId, y: normalizedY });
        });

        this.animate();
    }

    updatePaddles = ({ left, right }) => {
        this.leftPaddleMesh.position.y = (left.y - 0.5) * 10;
        this.rightPaddleMesh.position.y = (right.y - 0.5) * 10;
    };

    animate = () => {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    };
}
GameView.viewName = "GameView";

// --- Run Session ---
App.makeWidgetDock();

Session.join({
    apiKey: "2atXt6dTbNaKKO83iB4tsYDfmpusH0C6veTYXjy7Om",
    appId: "com.sarcastichedgehog.pongout3d",
    password: "pong3d",
    model: GameModel,
    view: GameView
});
