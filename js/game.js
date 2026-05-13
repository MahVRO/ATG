/**
 * Main Game Class
 * Coordinates all game systems
 */

class VoxelSandbox {
    constructor() {
        this.renderer = null;
        this.cameraController = null;
        this.chunkManager = null;
        this.playerPhysics = null;
        this.blockInteraction = null;
        this.inventory = null;
        this.uiManager = null;

        this.isRunning = false;
        this.isPaused = false;
        this.gamemode = 'survival'; // or 'creative'
        this.seed = Math.floor(Math.random() * 1000000);

        this.frameTimeMs = 16; // ~60 FPS target
        this.lastFrameTime = 0;
    }

    async initialize() {
        // Hide loading screen after a delay (loading happens in background)
        const hideLoadingScreen = () => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        };

        // Initialize renderer
        this.renderer = new GameRenderer();
        this.renderer.initialize(document.getElementById('game-canvas'));
        window.gameRenderer = this.renderer;

        // Initialize camera
        this.cameraController = new CameraController(this.renderer.getCamera());
        window.cameraController = this.cameraController;

        // Initialize chunk manager
        this.chunkManager = new ChunkManager(this.renderer, 8);

        // Initialize player
        this.playerPhysics = new PlayerPhysics();
        this.playerPhysics.position.set(0, 64, 0);

        // Initialize block interaction
        this.blockInteraction = new BlockInteraction();

        // Initialize inventory
        this.inventory = new Inventory();

        // Initialize UI
        this.uiManager = new UIManager();
        this.uiManager.initialize(document.body);

        // Initialize save system
        await gameSaveSystem.initialize();

        // Setup input
        this.setupInput();

        // Hide loading screen
        setTimeout(hideLoadingScreen, 500);

        // Start game loop
        this.isRunning = true;
        this.gameLoop();

        console.log('Game initialized');
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.playerPhysics.keyState.forward = true; break;
                case 'KeyA': this.playerPhysics.keyState.left = true; break;
                case 'KeyS': this.playerPhysics.keyState.backward = true; break;
                case 'KeyD': this.playerPhysics.keyState.right = true; break;
                case 'Space': this.playerPhysics.keyState.jump = true; e.preventDefault(); break;
                case 'ShiftLeft': 
                case 'ShiftRight': this.playerPhysics.keyState.shift = true; break;
                case 'KeyE': this.playerPhysics.setFlying(!this.playerPhysics.isFlying); break;
                case 'Escape': this.togglePause(); break;
                case 'KeyF': 
                    if (e.ctrlKey) {
                        this.uiManager.toggleDebug();
                    }
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                case 'Digit8':
                case 'Digit9':
                    const slot = parseInt(e.code[5]) - 1;
                    this.inventory.selectSlot(slot);
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.playerPhysics.keyState.forward = false; break;
                case 'KeyA': this.playerPhysics.keyState.left = false; break;
                case 'KeyS': this.playerPhysics.keyState.backward = false; break;
                case 'KeyD': this.playerPhysics.keyState.right = false; break;
                case 'Space': this.playerPhysics.keyState.jump = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.playerPhysics.keyState.shift = false; break;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.isPaused && this.cameraController.isLocked) {
                if (e.button === 0) { // Left click
                    this.handleBlockBreak();
                } else if (e.button === 2) { // Right click
                    this.handleBlockPlace();
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.blockInteraction.currentlyBreaking = null;
            }
        });

        // Pause menu buttons
        document.getElementById('resume-btn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('settings-btn')?.addEventListener('click', () => alert('Settings not yet implemented'));
        document.getElementById('menu-btn')?.addEventListener('click', () => window.location.reload());

        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleBlockBreak() {
        const creative = this.gamemode === 'creative';
        this.blockInteraction.breakBlock(
            this.renderer.getCamera(),
            this.chunkManager,
            creative
        );
    }

    handleBlockPlace() {
        const blockId = this.inventory.getSelectedBlockId();
        if (blockId !== 0) {
            const creative = this.gamemode === 'creative';
            this.blockInteraction.placeBlock(
                this.renderer.getCamera(),
                this.chunkManager,
                blockId,
                creative
            );
            if (!creative) {
                this.inventory.removeSelectedBlock();
            }
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.uiManager.togglePauseMenu(this.isPaused);
        if (this.isPaused) {
            document.exitPointerLock?.();
        }
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        if (!this.isRunning || this.isPaused) {
            return;
        }

        // Update systems
        this.playerPhysics.update(this.chunkManager);
        
        // Update camera position
        const eyePos = this.playerPhysics.getEyePosition();
        this.renderer.getCamera().position.copy(eyePos);

        // Update chunks
        this.chunkManager.updatePlayerPosition(this.playerPhysics.position.x, this.playerPhysics.position.z);
        this.chunkManager.updateChunkMeshes();

        // Update UI
        this.uiManager.updateHotbar(this.inventory);
        this.uiManager.updateInfo(this.playerPhysics, this.renderer.getStats());

        // Render
        this.renderer.render();
    }

    async saveGame() {
        const worldData = {
            seed: this.seed,
            gamemode: this.gamemode,
            playerX: this.playerPhysics.position.x,
            playerY: this.playerPhysics.position.y,
            playerZ: this.playerPhysics.position.z,
            inventory: this.inventory
        };

        await gameSaveSystem.saveWorld('default', worldData);
        console.log('Game saved');
    }

    async loadGame() {
        const data = await gameSaveSystem.loadWorld('default');
        if (data) {
            this.seed = data.seed;
            this.gamemode = data.gamemode;
            this.playerPhysics.position.set(data.playerX, data.playerY, data.playerZ);
            console.log('Game loaded');
        }
    }

    dispose() {
        this.isRunning = false;
        this.chunkManager.dispose();
        this.renderer.dispose();
    }
}

// Global game instance
let gameInstance = null;
window.gameInstance = gameInstance;

// Initialize on page load
window.addEventListener('load', async () => {
    gameInstance = new VoxelSandbox();
    window.gameInstance = gameInstance;
    await gameInstance.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameInstance) {
        gameInstance.dispose();
    }
});
