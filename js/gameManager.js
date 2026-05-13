// Game Manager - VOX Game

const GAMES = [
    {
        id: 'vox',
        name: 'VOX - Voxel World',
        emoji: '🎮',
        description: 'Build, explore, and survive in a voxel world',
        path: 'games/3d/vox/index.html'
    }
];

let currentGame = null;

// Initialize the game manager
document.addEventListener('DOMContentLoaded', () => {
    setupModal();
});

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
    gameContainer.innerHTML = `<iframe src="${currentGame.path}" style="width: 100%; height: 100%; border: none;"></iframe>`;
    
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
