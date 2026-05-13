// Game Manager - Handles loading and displaying games

const GAMES = [
    {
        id: 'flappy-bird',
        name: 'Flappy Bird Clone',
        type: '2d',
        emoji: '🐤',
        description: 'A classic Flappy Bird game built with Canvas',
        path: 'games/2d/flappy-bird/index.html'
    },
    {
        id: 'snake',
        name: 'Snake Game',
        type: '2d',
        emoji: '🐍',
        description: 'Classic snake game - grow and avoid yourself',
        path: 'games/2d/snake/index.html'
    },
    {
        id: 'cube-viewer',
        name: '3D Cube',
        type: '3d',
        emoji: '🎲',
        description: 'Interactive 3D cube built with Three.js',
        path: 'games/3d/cube-viewer/index.html'
    },
    {
        id: 'planet-explorer',
        name: 'Planet Explorer',
        type: '3d',
        emoji: '🌍',
        description: 'Explore a 3D planet with Three.js',
        path: 'games/3d/planet-explorer/index.html'
    }
];

let currentFilter = 'all';
let currentGame = null;

// Initialize the game manager
document.addEventListener('DOMContentLoaded', () => {
    renderGames();
    setupFilterButtons();
    setupModal();
});

// Render games to the grid
function renderGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '';

    GAMES.filter(game => currentFilter === 'all' || game.type === currentFilter)
        .forEach(game => {
            const gameCard = createGameCard(game);
            gamesGrid.appendChild(gameCard);
        });
}

// Create a game card element
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
        <div class="game-thumbnail">${game.emoji}</div>
        <div class="game-info">
            <h3>${game.name}</h3>
            <span class="game-type ${game.type}">${game.type.toUpperCase()}</span>
            <p class="game-description">${game.description}</p>
            <button class="play-btn" onclick="openGame('${game.id}')">Play Now</button>
        </div>
    `;
    return card;
}

// Setup filter buttons
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderGames();
        });
    });
}

// Setup modal functionality
function setupModal() {
    const modal = document.getElementById('modal') || createModal();
    const closeBtn = modal.querySelector('.close-btn');
    
    closeBtn.addEventListener('click', closeGame);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeGame();
    });
}

// Create modal element
function createModal() {
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Game Title</h2>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div id="gameContainer"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Open a game
function openGame(gameId) {
    currentGame = GAMES.find(g => g.id === gameId);
    if (!currentGame) return;

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const gameContainer = document.getElementById('gameContainer');

    modalTitle.textContent = currentGame.name;
    gameContainer.innerHTML = `<iframe src="${currentGame.path}" style="width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>`;
    
    modal.classList.add('active');
}

// Close game
function closeGame() {
    const modal = document.getElementById('modal');
    const gameContainer = document.getElementById('gameContainer');
    modal.classList.remove('active');
    gameContainer.innerHTML = '';
    currentGame = null;
}
