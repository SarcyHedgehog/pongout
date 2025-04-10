// src/Game.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Configuration Constants --- (Keep these as before)
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 15;
const INITIAL_PADDLE_HEIGHT = 100;
const MIN_PADDLE_HEIGHT = 20;
const PADDLE_OFFSET = 10;
const BALL_RADIUS = 8;
const INITIAL_BALL_SPEED = 350;
const BRICK_COLUMNS = 5;
const BRICK_WIDTH = 30;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 4;
const INITIAL_LIVES = 3;
const PADDLE_HEIGHT_REDUCTION = 0.10;
const BOT_PADDLE_SPEED = 280;
const PLAYER_COLOR = '#00bfff';  // Portal Blue
const BOT_COLOR = '#ff6a00';     // Portal Orange


// --- Helper: Create Bricks --- (Keep as before)
const createBricks = () => {
    // ... (same implementation as previous correct version) ...
    console.log("Creating bricks...");
    const bricks = [];
    const totalBrickWidth = BRICK_COLUMNS * (BRICK_WIDTH + BRICK_GAP) - BRICK_GAP;
    const wallStartX = (GAME_WIDTH / 2) - (totalBrickWidth / 2);
    const topMargin = BRICK_GAP;
    let currentY = topMargin;
    let row = 0;
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

// --- Helper: Reset Ball/Balls 
const resetBalls = () => {
    const speed = INITIAL_BALL_SPEED;
    const angle1 = (Math.random() * Math.PI / 2 - Math.PI / 4);
    const angle2 = (Math.random() * Math.PI / 2 - Math.PI / 4);
    return [
        {
            id: 'ball-0',
            owner: 'player',
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            dx: Math.cos(angle1) * speed,
            dy: Math.sin(angle1) * speed,
            radius: BALL_RADIUS,
            color: PLAYER_COLOR
        },
        {
            id: 'ball-1',
            owner: 'bot',
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            dx: -Math.cos(angle2) * speed,
            dy: Math.sin(angle2) * speed,
            radius: BALL_RADIUS,
            color: BOT_COLOR
        }
    ];
};



function Game() {
    const [gameState, setGameState] = useState('idle');
    const [winner, setWinner] = useState(null);
    const [balls, setBalls] = useState(resetBalls());
    const [bricks, setBricks] = useState(createBricks()); // Initial bricks
    const [paddles, setPaddles] = useState({
        player: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 },
        bot: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 }
    });

    const gameAreaRef = useRef(null);
    const animationFrameId = useRef(null);
    const lastTimestamp = useRef(0);
    // Use a ref to store brick state accessible synchronously within gameLoop updates
    const bricksRef = useRef(bricks);
    // Update the ref whenever the bricks state changes
    useEffect(() => {
        bricksRef.current = bricks;
    }, [bricks]);


    // --- Game Reset Function --- (Keep as before)
    const resetGame = useCallback(() => {
       // ... (same implementation as previous correct version) ...
        console.log("Resetting game...");
        setPaddles({
            player: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 },
            bot: { y: GAME_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2, height: INITIAL_PADDLE_HEIGHT, misses: 0 }
        });
        setBalls(resetBalls());
        const newBricks = createBricks();
        setBricks(newBricks); // Set state
        bricksRef.current = newBricks; // Update ref immediately
        setWinner(null);
        setGameState('idle');
        lastTimestamp.current = 0;
        if (animationFrameId.current) {
             cancelAnimationFrame(animationFrameId.current);
             animationFrameId.current = null;
        }
    }, []);

    // --- Input Handling (Player Paddle) --- (Keep as before)
    const handleMouseMove = useCallback((event) => {
        // ... (same implementation as previous correct version) ...
        if (!gameAreaRef.current || gameState !== 'playing') return;
        const rect = gameAreaRef.current.getBoundingClientRect();
        const mouseY = event.clientY - rect.top;
        const playerPaddleHeight = paddles.player.height;
        let targetY = mouseY - playerPaddleHeight / 2;
        targetY = Math.max(0, Math.min(GAME_HEIGHT - playerPaddleHeight, targetY));
        setPaddles(prev => ({ ...prev, player: { ...prev.player, y: targetY } }));
    }, [paddles.player, gameState]);

    // --- Attach mouse listener --- (Keep as before)
    useEffect(() => {
        // ... (same implementation as previous correct version) ...
        const gameArea = gameAreaRef.current;
        if (gameArea && gameState === 'playing') {
            gameArea.addEventListener('mousemove', handleMouseMove);
            return () => gameArea.removeEventListener('mousemove', handleMouseMove);
        }
    }, [gameState, handleMouseMove]);


// ... [snipped top part of your Game.jsx file: imports, constants, etc.] ...

const PHYSICS_STEPS_PER_FRAME = 4; // Break each frame into smaller physics steps

// [Swept Collision + Dual-Ball Logic Update]
// This replaces the gameLoop with improved collision and support for two independent balls

const gameLoop = useCallback((timestamp) => {
    if (gameState !== 'playing') {
        animationFrameId.current = null;
        return;
    }

    const deltaTime = lastTimestamp.current ? (timestamp - lastTimestamp.current) / 1000 : 0;
    lastTimestamp.current = timestamp;
    const dt = Math.min(deltaTime, 1 / 60);

    if (dt <= 0) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return;
    }

    const stepTime = dt / 4; // 4 physics sub-steps per frame
    let nextBalls = [...balls];
    let bricksHit = new Set();
    let winner = null;
    let endGame = false;

    for (let step = 0; step < 4; step++) {
        nextBalls = nextBalls.map(ball => {
            let { x, y, dx, dy, radius, id, owner } = { ...ball };
            const prevX = x;
            const prevY = y;

            x += dx * stepTime;
            y += dy * stepTime;

            // Wall collision (top/bottom)
            if (y - radius < 0) {
                y = radius;
                dy = Math.abs(dy);
            } else if (y + radius > GAME_HEIGHT) {
                y = GAME_HEIGHT - radius;
                dy = -Math.abs(dy);
            }

            // Paddle collision
            const checkPaddle = (paddle, side) => {
                const edgeX = (side === 'player') ? PADDLE_OFFSET + PADDLE_WIDTH : GAME_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
                const minX = (side === 'player') ? PADDLE_OFFSET : GAME_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
                const maxX = (side === 'player') ? PADDLE_OFFSET + PADDLE_WIDTH : GAME_WIDTH - PADDLE_OFFSET;

                if (
                    x + radius > minX && x - radius < maxX &&
                    y + radius > paddle.y && y - radius < paddle.y + paddle.height
                ) {
                    const hitFromCorrectSide = (side === 'player' && dx < 0 && prevX - radius >= edgeX) ||
                                               (side === 'bot' && dx > 0 && prevX + radius <= edgeX);
                    if (hitFromCorrectSide) {
                        x = (side === 'player') ? edgeX + radius : edgeX - radius;
                        dx *= -1;
                        const offset = (y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
                        const angle = offset * (Math.PI / 3);
                        const speed = Math.sqrt(dx * dx + dy * dy) || INITIAL_BALL_SPEED;
                        dy = speed * Math.sin(angle);
                        dx = speed * Math.cos(angle) * (side === 'player' ? 1 : -1);
                    }
                }
            };

            checkPaddle(paddles.player, 'player');
            checkPaddle(paddles.bot, 'bot');

            // Brick collision (swept)
            const currentBricks = bricksRef.current;
            for (let i = 0; i < currentBricks.length; i++) {
                const brick = currentBricks[i];
                if (!brick.alive || bricksHit.has(i)) continue;

                const ballLeft = x - radius;
                const ballRight = x + radius;
                const ballTop = y - radius;
                const ballBottom = y + radius;

                const brickLeft = brick.x;
                const brickRight = brick.x + brick.width;
                const brickTop = brick.y;
                const brickBottom = brick.y + brick.height;

                if (
                    ballRight > brickLeft && ballLeft < brickRight &&
                    ballBottom > brickTop && ballTop < brickBottom
                ) {
                    // Determine axis of entry based on previous position
                    const prevLeft = prevX - radius;
                    const prevRight = prevX + radius;
                    const prevTop = prevY - radius;
                    const prevBottom = prevY + radius;

                    const penX = Math.min(prevRight - brickLeft, brickRight - prevLeft);
                    const penY = Math.min(prevBottom - brickTop, brickBottom - prevTop);

                    if (penX < penY) {
                        dx *= -1;
                        x = dx > 0 ? brickLeft - radius - 0.1 : brickRight + radius + 0.1;
                    } else {
                        dy *= -1;
                        y = dy > 0 ? brickTop - radius - 0.1 : brickBottom + radius + 0.1;
                    }

                    bricksHit.add(i);
                    break;
                }
            }

            // Check for goal (past paddle)
            if (x + radius < PADDLE_OFFSET) {
                // Passed player side
                if (owner === 'player') {
                    // Missed own ball
                    setPaddles(prev => {
                        const p = prev.player;
                        const misses = p.misses + 1;
                        const shrink = misses % INITIAL_LIVES === 0 ? Math.max(MIN_PADDLE_HEIGHT, p.height * (1 - PADDLE_HEIGHT_REDUCTION)) : p.height;
                        return {
                            ...prev,
                            player: { ...p, misses, height: shrink }
                        };
                    });
                    // Reset ball
                    const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
                    const speed = INITIAL_BALL_SPEED;
                    const side = Math.random() < 0.5 ? 'player' : 'bot';
                    x = GAME_WIDTH / 2;
                    y = GAME_HEIGHT / 2;
                    dx = (side === 'player' ? 1 : -1) * Math.cos(angle) * speed;
                    dy = Math.sin(angle) * speed;
                    owner = side;
                } else {
                    winner = owner;
                    endGame = true;
                }
            } else if (x - radius > GAME_WIDTH - PADDLE_OFFSET) {
                // Passed bot side
                if (owner === 'bot') {
                    setPaddles(prev => {
                        const p = prev.bot;
                        const misses = p.misses + 1;
                        const shrink = misses % INITIAL_LIVES === 0 ? Math.max(MIN_PADDLE_HEIGHT, p.height * (1 - PADDLE_HEIGHT_REDUCTION)) : p.height;
                        return {
                            ...prev,
                            bot: { ...p, misses, height: shrink }
                        };
                    });
                    const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
                    const speed = INITIAL_BALL_SPEED;
                    const side = Math.random() < 0.5 ? 'player' : 'bot';
                    x = GAME_WIDTH / 2;
                    y = GAME_HEIGHT / 2;
                    dx = (side === 'player' ? 1 : -1) * Math.cos(angle) * speed;
                    dy = Math.sin(angle) * speed;
                    owner = side;
                } else {
                    winner = owner;
                    endGame = true;
                }
            }

            return { id, x, y, dx, dy, radius, owner };
        });

        if (endGame) break;
    }

    // Update bricks
    if (bricksHit.size > 0) {
        setBricks(prev => prev.map((brick, i) =>
            bricksHit.has(i) ? { ...brick, alive: false } : brick
        ));
    }

    if (endGame) {
        setWinner(winner);
        setGameState('gameOver');
    } else {
        setBalls(nextBalls);
    }

    // Bot AI tracking first ball
    setPaddles(prev => {
        const bot = prev.bot;
        const ball = nextBalls.find(b => b.owner === 'player') || nextBalls[0];
        if (!ball) return prev;
        const targetY = ball.y - bot.height / 2;
        let moveY = 0;
        if (targetY < bot.y) moveY = Math.max(-BOT_PADDLE_SPEED * dt, targetY - bot.y);
        else if (targetY > bot.y) moveY = Math.min(BOT_PADDLE_SPEED * dt, targetY - bot.y);
        const newY = Math.max(0, Math.min(GAME_HEIGHT - bot.height, bot.y + moveY));
        return newY !== bot.y ? { ...prev, bot: { ...bot, y: newY } } : prev;
    });

    if (!endGame) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
        animationFrameId.current = null;
    }
}, [gameState, paddles, balls]);


    // --- Effect to start/stop the game loop --- (Keep as before)
    useEffect(() => {
       // ... (same implementation as previous correct version) ...
         if (gameState === 'playing') {
            console.log("Starting game loop...");
            lastTimestamp.current = performance.now();
            bricksRef.current = bricks; // Ensure ref is up-to-date on start
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else {
            // ... stop loop ...
             if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }
        }
        return () => { /* ... cleanup ... */ if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }};
    }, [gameState, gameLoop, bricks]); // Add bricks as dependency to update ref if needed


    // --- Button Handler --- (Keep as before)
    const handleStartClick = () => {
       // ... (same implementation as previous correct version) ...
         if (gameState === 'idle' || gameState === 'gameOver') { resetGame(); setGameState('playing'); }
    };


    // --- Render Logic --- (Keep as before)
    return (
        <div
            ref={gameAreaRef}
            className="game-container"
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
            {/* Info Display */}
  <div className="info-display">
    <span style={{ color: PLAYER_COLOR }}>
        Player Misses: {paddles.player.misses} (H: {paddles.player.height.toFixed(0)})
    </span>
    <span style={{ color: BOT_COLOR }}>
        Bot Misses: {paddles.bot.misses} (H: {paddles.bot.height.toFixed(0)})
    </span>
</div>


            {/* Paddles */}
 {/* Player Paddle */}
<div
    className="paddle"
    style={{
        left: PADDLE_OFFSET,
        top: paddles.player.y,
        width: PADDLE_WIDTH,
        height: paddles.player.height,
        backgroundColor: PLAYER_COLOR
    }}
/>

{/* Bot Paddle */}
<div
    className="paddle"
    style={{
        right: PADDLE_OFFSET,
        top: paddles.bot.y,
        width: PADDLE_WIDTH,
        height: paddles.bot.height,
        backgroundColor: BOT_COLOR
    }}
/>

           {/* Balls */}
{gameState === 'playing' && balls.map(ball => (
    <div
        key={ball.id}
        className="ball"
        style={{
            left: ball.x - ball.radius,
            top: ball.y - ball.radius,
            width: ball.radius * 2,
            height: ball.radius * 2,
            backgroundColor: ball.color // ← this is the new bit
        }}
    />
))}


            {/* Bricks */}
            {bricks.map(brick => (
                brick.alive && ( <div key={brick.id} className="brick" style={{ left: brick.x, top: brick.y, width: brick.width, height: brick.height }} /> )
            ))}

            {/* Message Overlay */}
            {(gameState === 'idle' || gameState === 'gameOver') && (
                 <div className="message-overlay">
                    {/* ... (render messages and button) ... */}
                    {gameState === 'gameOver' && (<h2>{winner === 'player' ? 'You Win!' : 'Bot Wins!'}</h2>)}
                     {gameState === 'idle' && (<h2>Pong / Breakout</h2>)}
                    <button onClick={handleStartClick}>{gameState === 'gameOver' ? 'Play Again?' : 'Start Game'}</button>
                 </div>
            )}
        </div>
    );
}

export default Game;