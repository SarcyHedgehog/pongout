// src/Game.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Configuration Constants ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 15;
const INITIAL_PADDLE_HEIGHT = 100;
const MIN_PADDLE_HEIGHT = 20; // Minimum paddle size
const PADDLE_OFFSET = 10; // Distance from paddle back to wall
const BALL_RADIUS = 8;
const INITIAL_BALL_SPEED = 350; // pixels per second
// Removed BRICK_ROWS - calculated dynamically now
const BRICK_COLUMNS = 5; // <<-- ADJUSTABLE DEPTH
const BRICK_WIDTH = 30;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 4;
// Removed BRICK_WALL_START_X/Y - calculated in createBricks
const INITIAL_LIVES = 3; // Number of misses before paddle shrinks
const PADDLE_HEIGHT_REDUCTION = 0.10; // 10% reduction per INITIAL_LIVES misses
const BOT_PADDLE_SPEED = 280; // Max speed of bot paddle (pixels per second)


// --- Helper: Create Bricks (Revised for full height) ---
const createBricks = () => {
    console.log("Creating bricks...");
    const bricks = [];
    const totalBrickWidth = BRICK_COLUMNS * (BRICK_WIDTH + BRICK_GAP) - BRICK_GAP;
    const wallStartX = (GAME_WIDTH / 2) - (totalBrickWidth / 2);
    const topMargin = BRICK_GAP; // Start near the top

    let currentY = topMargin;
    let row = 0;
    // Keep adding rows as long as a full brick plus gap fits within the game height
    while (currentY + BRICK_HEIGHT <= GAME_HEIGHT - BRICK_GAP) {
        for (let c = 0; c < BRICK_COLUMNS; c++) {
            bricks.push({
                id: `brick-${row}-${c}`,
                x: wallStartX + c * (BRICK_WIDTH + BRICK_GAP),
                y: currentY,
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                alive: true,
            });
        }
        currentY += BRICK_HEIGHT + BRICK_GAP;
        row++;
    }
    console.log(`Created ${bricks.length} bricks in ${row} rows.`);
    return bricks;
};

// --- Helper: Reset Ball/Balls --- (Single ball implementation for now)
const resetBalls = (servingSide = Math.random() < 0.5 ? 'player' : 'bot') => {
    const angle = (Math.random() * Math.PI / 2 - Math.PI / 4); // +/- 45 degrees
    const speed = INITIAL_BALL_SPEED;
    return [{ // Return an array, even for one ball, for future consistency
        id: 'ball-0', // Give balls IDs
        owner: servingSide, // Track who "owns" the ball (important for scoring)
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        dx: (servingSide === 'player' ? 1 : -1) * Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        radius: BALL_RADIUS
    }];
};


function Game() {
    const [gameState, setGameState] = useState('idle'); // 'idle', 'playing', 'gameOver'
    const [winner, setWinner] = useState(null); // 'player', 'bot'
    const [balls, setBalls] = useState(resetBalls()); // Use array for balls state
    const [bricks, setBricks] = useState(createBricks());
    const [paddles, setPaddles] = useState({
        player: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 },
        bot: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 }
    });

    const gameAreaRef = useRef(null);
    const animationFrameId = useRef(null);
    const lastTimestamp = useRef(0);


    // --- Game Reset Function --- (Updated)
    const resetGame = useCallback(() => {
        console.log("Resetting game...");
        setPaddles({
            player: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 },
            bot: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 }
        });
        setBalls(resetBalls()); // Use the new reset function
        setBricks(createBricks()); // Recreate bricks from scratch
        setWinner(null);
        setGameState('idle'); // Ready to start
        lastTimestamp.current = 0; // Reset timestamp for dt calculation
        if (animationFrameId.current) {
             cancelAnimationFrame(animationFrameId.current);
             animationFrameId.current = null;
        }
    }, []); // No dependencies, this function is stable


    // --- Input Handling (Player Paddle) --- (Correctly uses state)
    const handleMouseMove = useCallback((event) => {
        if (!gameAreaRef.current || gameState !== 'playing') return;

        const rect = gameAreaRef.current.getBoundingClientRect();
        const mouseY = event.clientY - rect.top;

        // Access current paddle height directly from state within the event handler
        const playerPaddleHeight = paddles.player.height;

        // Center paddle on mouse, clamping position
        let targetY = mouseY - playerPaddleHeight / 2;
        targetY = Math.max(0, Math.min(GAME_HEIGHT - playerPaddleHeight, targetY));

        setPaddles(prev => ({
            ...prev,
            player: { ...prev.player, y: targetY }
        }));
    }, [paddles.player, gameState]); // Dependency on paddles.player ensures height is current


    // Attach mouse listener
    useEffect(() => {
        const gameArea = gameAreaRef.current;
        if (gameArea && gameState === 'playing') {
            gameArea.addEventListener('mousemove', handleMouseMove);
            return () => gameArea.removeEventListener('mousemove', handleMouseMove);
        }
    }, [gameState, handleMouseMove]);


    // --- Game Loop using requestAnimationFrame --- (Includes Collision Fixes)
    const gameLoop = useCallback((timestamp) => {
        if (gameState !== 'playing') {
            animationFrameId.current = null;
            return;
        }

        const deltaTime = lastTimestamp.current ? (timestamp - lastTimestamp.current) / 1000 : 0;
        lastTimestamp.current = timestamp;
        const dt = Math.min(deltaTime, 1 / 30); // Cap delta time

        if (dt <= 0) {
             animationFrameId.current = requestAnimationFrame(gameLoop);
             return;
        }

        let gameShouldEnd = false;
        let theWinner = null;

        // --- Update Balls State ---
        setBalls(prevBalls => {
            // Since we only have one ball now, we simplify, but keep the array structure
            if (!prevBalls || prevBalls.length === 0) return []; // Should not happen, but safe guard

            const ball = { ...prevBalls[0] }; // Work with a copy of the first (only) ball
            let { id, owner, x, y, dx, dy, radius } = ball;

            // 1. Update Ball Position
            x += dx * dt;
            y += dy * dt;

            // --- Collision Detection ---

            // 2. Top/Bottom Wall Collision
            if (y - radius < 0) {
                y = radius;
                dy = Math.abs(dy);
            } else if (y + radius > GAME_HEIGHT) {
                y = GAME_HEIGHT - radius;
                dy = -Math.abs(dy);
            }

            // 3. Paddle Collision Check (Updated for offset)
            const checkPaddleHit = (paddle, side) => {
                const paddleEdgeX = (side === 'player')
                    ? PADDLE_OFFSET + PADDLE_WIDTH
                    : GAME_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
                const paddleMinX = (side === 'player') ? PADDLE_OFFSET : GAME_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
                const paddleMaxX = (side === 'player') ? PADDLE_OFFSET + PADDLE_WIDTH : GAME_WIDTH - PADDLE_OFFSET;

                if (x + radius > paddleMinX && x - radius < paddleMaxX &&
                    y + radius > paddle.y && y - radius < paddle.y + paddle.height)
                {
                    const prevX = x - dx * dt; // Use the original x before adding dx*dt

                    if ((side === 'player' && dx < 0 && prevX - radius >= paddleEdgeX) ||
                        (side === 'bot'    && dx > 0 && prevX + radius <= paddleEdgeX))
                    {
                        x = (side === 'player') ? paddleEdgeX + radius : paddleEdgeX - radius;
                        dx *= -1;

                        const hitPos = (y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
                        const maxBounceAngle = Math.PI / 3;
                        const bounceAngle = hitPos * maxBounceAngle;
                        const speed = Math.sqrt(dx * dx + dy * dy) || INITIAL_BALL_SPEED;
                        dy = speed * Math.sin(bounceAngle);
                        // Ensure dx direction matches the side after angle change
                        dx = speed * Math.cos(bounceAngle) * (side === 'player' ? 1 : -1);

                        return true; // Indicate hit
                    }
                }
                return false;
            };

            checkPaddleHit(paddles.player, 'player');
            checkPaddleHit(paddles.bot, 'bot');


            // 4. Brick Collision Check (REVISED & WORKING)
            let hitBrickInThisUpdate = false; // Local flag for this ball's update
            setBricks(currentBricks => {
                let updatedBricksData = null; // Store { index, newBrick } if hit

                for (let i = currentBricks.length - 1; i >= 0; i--) {
                    const brick = currentBricks[i];
                    if (!brick.alive || hitBrickInThisUpdate) continue;

                    // More precise AABB check
                    const ballLeft = x - radius;
                    const ballRight = x + radius;
                    const ballTop = y - radius;
                    const ballBottom = y + radius;
                    const brickLeft = brick.x;
                    const brickRight = brick.x + brick.width;
                    const brickTop = brick.y;
                    const brickBottom = brick.y + brick.height;

                    if (ballRight > brickLeft && ballLeft < brickRight &&
                        ballBottom > brickTop && ballTop < brickBottom)
                    {
                        hitBrickInThisUpdate = true; // Mark that this ball hit a brick

                        // Store the index and the new state for the brick
                        updatedBricksData = { index: i, newBrick: { ...brick, alive: false } };
                         console.log(`Brick ${brick.id} hit by ball ${id}!`);

                        // Determine bounce direction
                        const prevX = x - dx * dt;
                        const prevY = y - dy * dt;
                        const overlapX1 = (prevX + radius) - brick.x;
                        const overlapX2 = (brick.x + brick.width) - (prevX - radius);
                        const overlapY1 = (prevY + radius) - brick.y;
                        const overlapY2 = (brick.y + brick.height) - (prevY - radius);
                        const minDistX = Math.min(overlapX1 > 0 ? overlapX1 : Infinity, overlapX2 > 0 ? overlapX2 : Infinity);
                        const minDistY = Math.min(overlapY1 > 0 ? overlapY1 : Infinity, overlapY2 > 0 ? overlapY2 : Infinity);
                        const timeToHitX = dx !== 0 ? Math.abs(minDistX / dx) : Infinity;
                        const timeToHitY = dy !== 0 ? Math.abs(minDistY / dy) : Infinity;

                        if (timeToHitX < timeToHitY) {
                            dx *= -1;
                            // Nudge ball out based on which side was hit
                             x = dx > 0 ? brick.x - radius - 0.1 : brick.x + brick.width + radius + 0.1;
                        } else {
                            dy *= -1;
                             // Nudge ball out based on which side was hit
                            y = dy > 0 ? brick.y - radius - 0.1 : brick.y + brick.height + radius + 0.1;
                        }
                        break; // Exit brick loop after first hit for this ball
                    }
                }

                // Apply the brick update if one was hit
                if (updatedBricksData !== null) {
                     // Create a new array to ensure React re-renders
                    const nextBricks = [...currentBricks];
                    nextBricks[updatedBricksData.index] = updatedBricksData.newBrick;
                    return nextBricks;
                } else {
                    // No hit, return the original array reference
                    return currentBricks;
                }
            }); // End of setBricks update


            // 5. Goal Check (Updated for lives logic)
            let sideGoal = null;
            if (x + radius < PADDLE_OFFSET) { sideGoal = 'player'; }
            else if (x - radius > GAME_WIDTH - PADDLE_OFFSET) { sideGoal = 'bot'; }

            if (sideGoal) {
                console.log(`Ball ${id} went out on ${sideGoal} side. Ball owner: ${owner}`);
                if (owner === sideGoal) { // Owner missed their own ball
                     console.log(`${owner} missed their own ball!`);
                     setPaddles(prevPaddles => {
                        const targetPaddle = prevPaddles[owner];
                        const newMisses = targetPaddle.misses + 1;
                        let newHeight = targetPaddle.height;
                        if (newMisses > 0 && newMisses % INITIAL_LIVES === 0) {
                            newHeight = Math.max(MIN_PADDLE_HEIGHT, targetPaddle.height * (1 - PADDLE_HEIGHT_REDUCTION));
                            console.log(`${owner} paddle height reduced to ${newHeight}`);
                        }
                        return { ...prevPaddles, [owner]: { ...targetPaddle, misses: newMisses, height: newHeight } };
                    });
                    // Reset THIS ball
                    const resetSide = Math.random() < 0.5 ? 'player' : 'bot';
                    const angle = (Math.random() * Math.PI / 2 - Math.PI / 4);
                    x = GAME_WIDTH / 2;
                    y = GAME_HEIGHT / 2;
                    dx = (resetSide === 'player' ? 1 : -1) * Math.cos(angle) * INITIAL_BALL_SPEED;
                    dy = Math.sin(angle) * INITIAL_BALL_SPEED;
                    owner = resetSide; // Reassign owner
                } else { // Owner scored on the opponent
                    console.log(`${owner} scored! Winner: ${owner}`);
                    theWinner = owner;
                    gameShouldEnd = true;
                    // Stop the ball immediately
                    dx = 0;
                    dy = 0;
                    x = GAME_WIDTH / 2;
                    y = GAME_HEIGHT / 2;
                }
            }

            // Return the updated state for the single ball in an array
            return [{ id, owner, x, y, dx, dy, radius }];
        }); // End of setBalls update


        // Update winner and game state *after* ball updates are processed
        if (gameShouldEnd) {
            setWinner(theWinner);
            setGameState('gameOver');
        }

        // --- Update Bot Paddle AI --- (Tracks the first ball)
        setPaddles(prevPaddles => {
            if (gameState !== 'playing') return prevPaddles; // Only update AI if playing

            const botPaddle = prevPaddles.bot;
            const targetBall = balls[0]; // AI tracks the first (only) ball
            if (!targetBall) return prevPaddles;

            const targetY = targetBall.y - botPaddle.height / 2;
            let moveY = 0;
            if (targetY < botPaddle.y) {
                moveY = -BOT_PADDLE_SPEED * dt;
                moveY = Math.max(moveY, targetY - botPaddle.y); // Don't overshoot
            } else if (targetY > botPaddle.y) {
                moveY = BOT_PADDLE_SPEED * dt;
                moveY = Math.min(moveY, targetY - botPaddle.y); // Don't overshoot
            }

            let newY = botPaddle.y + moveY;
            newY = Math.max(0, Math.min(GAME_HEIGHT - botPaddle.height, newY)); // Clamp

            // Only return new object if position changed
            if (newY !== botPaddle.y) {
                 return { ...prevPaddles, bot: { ...botPaddle, y: newY } };
            } else {
                 return prevPaddles;
            }
        }); // End of setPaddles for Bot AI

        // Request the next frame ONLY if the game hasn't ended
        if (!gameShouldEnd) {
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else {
             animationFrameId.current = null; // Ensure loop stops fully
        }

    }, [gameState, paddles, balls]); // balls is now dependency


    // Effect to start/stop the game loop based on gameState
    useEffect(() => {
        if (gameState === 'playing') {
            console.log("Starting game loop...");
            lastTimestamp.current = performance.now(); // Initialize timestamp
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else {
            console.log("Stopping game loop. State:", gameState);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
        }
        // Cleanup function
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
                 console.log("Cleaned up animation frame.");
            }
        };
    }, [gameState, gameLoop]); // gameLoop is a dependency


    // --- Button Handler ---
    const handleStartClick = () => {
        if (gameState === 'idle' || gameState === 'gameOver') {
            resetGame(); // Ensure clean state before starting/restarting
            setGameState('playing');
        }
    };


    // --- Render Logic --- (Updated for offset and ball array)
    return (
        <div
            ref={gameAreaRef}
            className="game-container"
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
            // Add mousemove listener here if preferred over useEffect approach
            // onMouseMove={handleMouseMove}
        >
            {/* Info Display */}
            <div className="info-display">
                <span>Player Misses: {paddles.player.misses} (H: {paddles.player.height.toFixed(0)})</span>
                <span>Bot Misses: {paddles.bot.misses} (H: {paddles.bot.height.toFixed(0)})</span>
            </div>

            {/* Player Paddle */}
            <div
                className="paddle"
                style={{
                    left: PADDLE_OFFSET, // Use offset
                    top: paddles.player.y,
                    width: PADDLE_WIDTH,
                    height: paddles.player.height,
                    backgroundColor: '#aaffa'
                }}
            />

            {/* Bot Paddle */}
            <div
                className="paddle"
                style={{
                    right: PADDLE_OFFSET, // Use offset
                    top: paddles.bot.y,
                    width: PADDLE_WIDTH,
                    height: paddles.bot.height,
                }}
            />

            {/* Balls (Iterate over balls array) */}
            {/* Only render balls when playing to avoid seeing them during menus */}
            {gameState === 'playing' && balls.map(ball => (
                 <div
                    key={ball.id} // Use ball's unique ID
                    className="ball"
                    style={{
                        left: ball.x - ball.radius,
                        top: ball.y - ball.radius,
                        width: ball.radius * 2,
                        height: ball.radius * 2,
                    }}
                 />
             ))}

            {/* Bricks (Render based on alive status) */}
            {bricks.map(brick => (
                brick.alive && (
                    <div
                        key={brick.id}
                        className="brick"
                        style={{
                            left: brick.x,
                            top: brick.y,
                            width: brick.width,
                            height: brick.height,
                        }}
                    />
                )
            ))}

            {/* Message Overlay (Start/Game Over) */}
            {(gameState === 'idle' || gameState === 'gameOver') && (
                <div className="message-overlay">
                    {gameState === 'gameOver' && (
                        <h2>{winner === 'player' ? 'You Win!' : 'Bot Wins!'}</h2>
                    )}
                     {gameState === 'idle' && (
                        <h2>Pong / Breakout</h2>
                    )}
                    <button onClick={handleStartClick}>
                        {gameState === 'gameOver' ? 'Play Again?' : 'Start Game'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default Game;