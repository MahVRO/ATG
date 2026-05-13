// Snake Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameOver = false;
let gamePaused = false;

// Snake
let snake = [
    { x: 5, y: 5 }
];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

// Food
let food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
};

// Generate new food
function generateFood() {
    let newFood;
    let collision;
    do {
        collision = false;
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                collision = true;
                break;
            }
        }
    } while (collision);
    
    food = newFood;
}

// Draw function
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = '#667eea';
        } else {
            ctx.fillStyle = '#764ba2';
        }
        ctx.fillRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2
        );
    });

    // Draw food
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Update function
function update() {
    if (gameOver || gamePaused) return;

    direction = nextDirection;

    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;

    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        endGame();
        return;
    }

    // Check self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            endGame();
            return;
        }
    }

    snake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('score').textContent = 'Score: ' + score;
        generateFood();
    } else {
        snake.pop();
    }
}

// End game
function endGame() {
    gameOver = true;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
    }
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalHighScore').textContent = highScore;
}

// Game loop
function gameLoop() {
    update();
    draw();
    setTimeout(gameLoop, 100);
}

// Input handling
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'arrowup' || key === 'w') {
        if (direction.y === 0) nextDirection = { x: 0, y: -1 };
        e.preventDefault();
    } else if (key === 'arrowdown' || key === 's') {
        if (direction.y === 0) nextDirection = { x: 0, y: 1 };
        e.preventDefault();
    } else if (key === 'arrowleft' || key === 'a') {
        if (direction.x === 0) nextDirection = { x: -1, y: 0 };
        e.preventDefault();
    } else if (key === 'arrowright' || key === 'd') {
        if (direction.x === 0) nextDirection = { x: 1, y: 0 };
        e.preventDefault();
    }
});

// Update UI
document.getElementById('high-score').textContent = 'High Score: ' + highScore;

// Start game
gameLoop();
