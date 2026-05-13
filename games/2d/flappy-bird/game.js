// Flappy Bird Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game variables
let score = 0;
let gameOver = false;

// Bird object
const bird = {
    x: canvas.width / 4,
    y: canvas.height / 2,
    width: 40,
    height: 40,
    velocity: 0,
    gravity: 0.6,
    jump: -15,
    color: '#FFD700'
};

// Pipes
let pipes = [];
const pipeWidth = 80;
const pipeGap = 150;
const pipeDistance = 300;

// Create initial pipes
function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - 50;
    const gapStart = Math.random() * (maxHeight - minHeight) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: gapStart,
        bottomStart: gapStart + pipeGap,
        width: pipeWidth,
        color: '#2d5016',
        passed: false
    });
}

// Initialize pipes
for (let i = 0; i < 3; i++) {
    setTimeout(() => createPipe(), i * pipeDistance);
}

// Draw bird
function drawBird() {
    ctx.fillStyle = bird.color;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    
    // Draw eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(bird.x + 28, bird.y + 12, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(bird.x + 28, bird.y + 12, 3, 0, Math.PI * 2);
    ctx.fill();
}

// Draw pipes
function drawPipes() {
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillStyle = pipe.color;
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomStart, pipe.width, canvas.height - pipe.bottomStart);
    });
}

// Update bird physics
function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Check ceiling and floor collision
    if (bird.y <= 0 || bird.y + bird.height >= canvas.height) {
        endGame();
    }
}

// Update pipes
function updatePipes() {
    pipes.forEach((pipe, index) => {
        pipe.x -= 5;

        // Check if bird passed the pipe
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score++;
            pipe.passed = true;
            document.getElementById('score').textContent = 'Score: ' + score;
        }

        // Check collision with pipe
        if (
            bird.x < pipe.x + pipe.width &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomStart)
        ) {
            endGame();
        }

        // Remove off-screen pipes and add new ones
        if (pipe.x + pipe.width < 0) {
            pipes.splice(index, 1);
            if (pipes.length < 3) {
                createPipe();
            }
        }
    });
}

// End game
function endGame() {
    gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        updateBird();
        updatePipes();
    }

    drawPipes();
    drawBird();

    requestAnimationFrame(gameLoop);
}

// Input handlers
function flap() {
    if (!gameOver) {
        bird.velocity = bird.jump;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        flap();
    }
});

canvas.addEventListener('click', flap);

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Start game
gameLoop();
