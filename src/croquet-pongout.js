// src/croquet-pongout.js
import * as Croquet from "@croquet/croquet";

Croquet.Constants = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleSpeed: 10,
};

class GameModel extends Croquet.Model {
    init() {
        this.paddles = {};
        this.subscribe("input", "move", this.movePaddle);
        this.publish("model", "initialized");
    }

    movePaddle(data) {
        this.paddles[data.viewId] = data.y;
        this.publish("view", "update", this.paddles);
    }
}

GameModel.register("GameModel");

class GameView extends Croquet.View {
    constructor(model) {
        super(model);
        this.model = model;
        console.log("View constructed");

        this.viewId = this.viewId; // Already set in Croquet.View
        console.log("View ID:", this.viewId);

        this.container = document.getElementById("game-container");
        if (!this.container) {
            console.error("#game-container not found");
            return;
        }
        console.log("Container found?", this.container.outerHTML);

        this.canvas = document.createElement("div");
        this.canvas.className = "game-canvas";
        this.container.appendChild(this.canvas);

        this.paddleEl = document.createElement("div");
        this.paddleEl.className = "paddle";
        this.canvas.appendChild(this.paddleEl);

        this.updatePaddlePosition(150); // Default position

        window.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            this.publish("input", "move", { viewId: this.viewId, y });
        });

        this.subscribe("view", "update", this.render);
    }

    updatePaddlePosition(y) {
        this.paddleEl.style.top = `${y}px`;
    }

    render(paddles) {
        const y = paddles[this.viewId];
        if (y !== undefined) {
            this.updatePaddlePosition(y);
        }
    }
}

Croquet.Session.join({
    apiKey: "2atXt6dTbNaKKO83iB4tsYDfmpusH0C6veTYXjy7Om",
    appId: "com.sarcastichedgehog.pongout",
    name: Croquet.App.autoSession(),
    password: "marmite",
    model: GameModel,
    view: GameView
});
