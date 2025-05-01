# Pongout 3D

A multiplayer 3D pong game using Three.js and MultiSynq for real-time synchronization.

## Features

- Real-time synchronized multiplayer
- 3D graphics with Three.js
- Two-player paddle control system
- Automatic player color assignment (orange/blue)
- Physics-based ball movement and collisions
- Shared game state across all players

## Technical Implementation

### Model (Game Logic)
- Synchronized game state using MultiSynq
- Physics calculations for ball movement
- Collision detection for balls and paddles
- Player management system

### View (Graphics)
- 3D scene rendering with Three.js
- Real-time paddle and ball movement
- Dynamic lighting and materials
- Responsive window resizing

### Controls
- Arrow Up: Move paddle up
- Arrow Down: Move paddle down

## Architecture

The game follows MultiSynq's model-view architecture:

- **Model**: Handles all game logic and state
- **View**: Manages 3D rendering and user input
- **Session**: Coordinates multiplayer synchronization

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install three @multisynq/client
```
3. Run the development server:
```bash
npm start
```
4. Open `http://localhost:3000` in your browser

## Multiplayer

- Share the session URL to invite players
- First player gets orange paddle
- Second player gets blue paddle
- Balls and paddles sync automatically

## Technologies

- Three.js for 3D graphics
- MultiSynq for real-time synchronization
- ES6+ JavaScript
- HTML5 Canvas