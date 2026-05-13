// Chat System - In-game messaging and commands

const chatSystem = {
    messages: [],
    maxMessages: 100,
    
    addMessage(text, sender = 'System', color = '#00d084') {
        const timestamp = new Date().toLocaleTimeString();
        this.messages.push({
            text,
            sender,
            timestamp,
            color
        });

        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    },

    getFormattedMessage(index) {
        const msg = this.messages[index];
        if (!msg) return '';
        return `[${msg.timestamp}] ${msg.sender}: ${msg.text}`;
    }
};

// Broadcast events to chat
function broadcastGameEvent(message) {
    addChatMessage(message, '⚙️ System');
}

// Chat commands
const commands = {
    help: {
        description: 'Show all commands',
        usage: '/help',
        execute() {
            addChatMessage('Available commands: /tp, /gamemode, /clear, /fill, /give, /help');
            addChatMessage('Commands start with /');
        }
    },

    tp: {
        description: 'Teleport to coordinates',
        usage: '/tp <x> <y> <z>',
        execute(args, player) {
            if (args.length < 3) {
                addChatMessage('Usage: /tp <x> <y> <z>');
                return;
            }
            const x = parseInt(args[0]);
            const y = parseInt(args[1]);
            const z = parseInt(args[2]);

            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                addChatMessage('Invalid coordinates');
                return;
            }

            player.position.set(x, y, z);
            addChatMessage(`Teleported to ${x} ${y} ${z}`, 'System');
        }
    },

    gamemode: {
        description: 'Change gamemode',
        usage: '/gamemode <creative|survival>',
        execute(args, player) {
            if (args.length < 1) {
                addChatMessage('Usage: /gamemode <creative|survival>');
                return;
            }
            const mode = args[0].toLowerCase();
            if (mode === 'creative' || mode === 'survival') {
                player.gameMode = mode;
                addChatMessage(`Gamemode changed to ${mode}`, 'System');
            } else {
                addChatMessage('Unknown gamemode. Use creative or survival.');
            }
        }
    },

    clear: {
        description: 'Clear inventory',
        usage: '/clear',
        execute(args, player) {
            player.inventory.slots.fill(null);
            updateHotbar();
            addChatMessage('Inventory cleared', 'System');
        }
    },

    fill: {
        description: 'Fill inventory with blocks',
        usage: '/fill [blockType]',
        execute(args, player) {
            const blockType = args[0] ? parseInt(args[0]) : BLOCK_TYPES.STONE;
            for (let i = 0; i < 10; i++) {
                player.inventory.slots[i] = { blockType, count: 64 };
            }
            updateHotbar();
            addChatMessage(`Inventory filled with ${getBlockName(blockType)}`, 'System');
        }
    },

    give: {
        description: 'Give item to player',
        usage: '/give <blockType> [count]',
        execute(args, player) {
            if (args.length < 1) {
                addChatMessage('Usage: /give <blockType> [count]');
                return;
            }
            const blockType = parseInt(args[0]);
            const count = args[1] ? parseInt(args[1]) : 64;

            if (isNaN(blockType)) {
                addChatMessage('Invalid block type');
                return;
            }

            player.inventory.addBlock(blockType, count);
            updateHotbar();
            addChatMessage(`Given ${count}x ${getBlockName(blockType)}`, 'System');
        }
    }
};

function executeCommand(fullCommand, player) {
    if (!fullCommand.startsWith('/')) return;

    const parts = fullCommand.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = commands[commandName];
    if (command) {
        command.execute(args, player);
    } else {
        addChatMessage(`Unknown command: ${commandName}. Type /help for commands.`);
    }
}
