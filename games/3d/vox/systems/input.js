// Input System - Handles keyboard and mouse input

let inputSystem = {
    keys: {},
    mouse: {
        x: 0,
        y: 0,
        locked: false
    }
};

function setupInputHandlers(player, world, camera) {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        inputSystem.keys[e.key.toLowerCase()] = true;

        // Custom key handlers
        switch (e.key.toLowerCase()) {
            case 'w':
                player.inputs.forward = true;
                break;
            case 's':
                player.inputs.backward = true;
                break;
            case 'a':
                player.inputs.left = true;
                break;
            case 'd':
                player.inputs.right = true;
                break;
            case ' ':
                if (!chatActive) {
                    e.preventDefault();
                    player.inputs.jump = true;
                }
                break;
            case 'shift':
                player.inputs.sprint = true;
                break;
            case 't':
                e.preventDefault();
                toggleChat();
                break;
            case 'escape':
                togglePauseMenu();
                break;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9': case '0':
                const slot = e.key === '0' ? 9 : parseInt(e.key) - 1;
                player.inventory.setActiveSlot(slot);
                updateHotbar();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        inputSystem.keys[e.key.toLowerCase()] = false;

        switch (e.key.toLowerCase()) {
            case 'w':
                player.inputs.forward = false;
                break;
            case 's':
                player.inputs.backward = false;
                break;
            case 'a':
                player.inputs.left = false;
                break;
            case 'd':
                player.inputs.right = false;
                break;
            case ' ':
                player.inputs.jump = false;
                break;
            case 'shift':
                player.inputs.sprint = false;
                break;
        }
    });

    // Mouse events
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body) {
            const sensitivity = 0.003;
            player.yaw -= e.movementX * sensitivity;
            player.pitch -= e.movementY * sensitivity;

            // Clamp pitch
            player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));

            // Update camera
            camera.position.copy(player.position);
            camera.position.y += 1.6;

            const direction = new THREE.Vector3();
            direction.x = Math.sin(player.yaw) * Math.cos(player.pitch);
            direction.y = Math.sin(player.pitch);
            direction.z = Math.cos(player.yaw) * Math.cos(player.pitch);

            camera.lookAt(camera.position.clone().add(direction));
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
            if (!chatActive && !isPaused) {
                player.breaking = true;
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            player.breaking = false;
            player.breakingBlock = null;
            player.breakingTime = 0;
        }
    });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!chatActive && !isPaused) {
            // Right click - place block
            return false;
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // Right click
            if (!chatActive && !isPaused) {
                const targetBlock = player.getTargetBlock();
                if (targetBlock) {
                    player.placeBlock(targetBlock);
                }
            }
        }
    });

    // Lock pointer on click
    document.addEventListener('click', () => {
        if (!chatActive && !isPaused) {
            document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            document.body.requestPointerLock();
        }
    });

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
        inputSystem.mouse.locked = document.pointerLockElement === document.body;
    });
}
