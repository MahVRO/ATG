// UI System - Hotbar, info display, and HUD

function initializeUI() {
    updateHotbar();
}

function updateHotbar() {
    const hotbarContainer = document.getElementById('hotbar');
    hotbarContainer.innerHTML = '';

    for (let i = 0; i < 10; i++) {
        const slot = player.inventory.slots[i];
        const slotElement = document.createElement('div');
        slotElement.className = 'hotbar-slot';
        if (i === player.inventory.activeSlot) {
            slotElement.classList.add('active');
        }

        if (slot) {
            const blockName = getBlockName(slot.blockType);
            const props = getBlockProperties(slot.blockType);
            slotElement.textContent = props.emoji;
            slotElement.title = `${blockName} x${slot.count}`;
        }

        slotElement.addEventListener('click', () => {
            player.inventory.setActiveSlot(i);
            updateHotbar();
        });

        hotbarContainer.appendChild(slotElement);
    }
}

function updatePlayerInfo(player) {
    document.getElementById('posX').textContent = Math.floor(player.position.x);
    document.getElementById('posY').textContent = Math.floor(player.position.y);
    document.getElementById('posZ').textContent = Math.floor(player.position.z);
    document.getElementById('modeDisplay').textContent = player.gameMode === 'creative' ? 'Creative' : 'Survival';
}

function drawBreakingProgress(renderer, player) {
    if (player.breaking && player.breakingBlock && player.breakingProgress > 0 && player.breakingProgress < 1) {
        // This would ideally render a breaking texture on the block
        // For now, we'll just track the progress
    }
}

// Chat UI
let chatActive = false;
let chatMessages = [];

function toggleChat() {
    chatActive = !chatActive;
    const chatInput = document.getElementById('chatInput');
    
    if (chatActive) {
        chatInput.style.display = 'block';
        chatInput.focus();
        document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    } else {
        chatInput.style.display = 'none';
    }
}

function addChatMessage(message, sender = 'System') {
    const timestamp = new Date().toLocaleTimeString();
    chatMessages.push({ sender, message, timestamp });

    // Keep only last 10 messages
    if (chatMessages.length > 10) {
        chatMessages.shift();
    }

    updateChatDisplay();
}

function updateChatDisplay() {
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML = '';

    chatMessages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.textContent = `[${msg.timestamp}] ${msg.sender}: ${msg.message}`;
        chatContainer.appendChild(messageEl);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Setup chat input
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const message = e.target.value.trim();
        if (message) {
            addChatMessage(message, 'Player');
            e.target.value = '';
            
            // Process commands
            if (message.startsWith('/')) {
                processCommand(message);
            }
        }
    } else if (e.key === 'Escape') {
        toggleChat();
    }
});

function processCommand(command) {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
        case 'tp':
            if (parts.length >= 4) {
                player.position.set(
                    parseInt(parts[1]),
                    parseInt(parts[2]),
                    parseInt(parts[3])
                );
                addChatMessage(`Teleported to ${parts[1]}, ${parts[2]}, ${parts[3]}`);
            }
            break;
        case 'gamemode':
            if (parts[1]) {
                const mode = parts[1].toLowerCase();
                if (mode === 'creative' || mode === 'survival') {
                    player.gameMode = mode;
                    addChatMessage(`Changed gamemode to ${mode}`);
                }
            }
            break;
        case 'clear':
            player.inventory.slots.fill(null);
            updateHotbar();
            addChatMessage('Inventory cleared');
            break;
        case 'fill':
            const blockType = parseInt(parts[1]) || BLOCK_TYPES.STONE;
            for (let i = 0; i < 10; i++) {
                player.inventory.slots[i] = { blockType, count: 64 };
            }
            updateHotbar();
            addChatMessage('Inventory filled');
            break;
        case 'help':
            addChatMessage('Commands: /tp /gamemode /clear /fill /help');
            break;
        default:
            addChatMessage(`Unknown command: ${cmd}`);
    }
}

// Game state
let isPaused = false;
let gameStarted = false;

function togglePauseMenu() {
    if (!gameStarted) return;
    
    isPaused = !isPaused;
    document.getElementById('pauseMenu').style.display = isPaused ? 'flex' : 'none';
    
    if (isPaused) {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
}

function resumeGame() {
    isPaused = false;
    document.getElementById('pauseMenu').style.display = 'none';
}

function changeGamemode() {
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gamemodePanel').style.display = 'flex';
}

function goHome() {
    window.parent.closeGame();
}

function startGame(gameMode) {
    gameStarted = true;
    document.getElementById('gamemodePanel').style.display = 'none';
    player.gameMode = gameMode;
    addChatMessage(`Started in ${gameMode} mode`);
    addChatMessage('Welcome to VOX! Press T for commands');
}
