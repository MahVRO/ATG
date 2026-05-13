// Player System - Player physics, inventory, and gamemode

class Inventory {
    constructor() {
        this.slots = new Array(10).fill(null);
        this.activeSlot = 0;
        // Initialize with some blocks
        this.slots[0] = { blockType: BLOCK_TYPES.STONE, count: 64 };
        this.slots[1] = { blockType: BLOCK_TYPES.DIRT, count: 64 };
        this.slots[2] = { blockType: BLOCK_TYPES.GRASS, count: 64 };
        this.slots[3] = { blockType: BLOCK_TYPES.SAND, count: 64 };
        this.slots[4] = { blockType: BLOCK_TYPES.OAK_LOG, count: 32 };
    }

    getActiveItem() {
        return this.slots[this.activeSlot];
    }

    setActiveSlot(slot) {
        if (slot >= 0 && slot < 10) {
            this.activeSlot = slot;
        }
    }

    addBlock(blockType, count = 1) {
        // Find empty slot or slot with same block
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i]) {
                this.slots[i] = { blockType, count };
                return true;
            }
            if (this.slots[i].blockType === blockType) {
                this.slots[i].count += count;
                return true;
            }
        }
        return false;
    }

    removeBlock(count = 1) {
        const item = this.getActiveItem();
        if (item) {
            item.count -= count;
            if (item.count <= 0) {
                this.slots[this.activeSlot] = null;
            }
            return true;
        }
        return false;
    }
}

class Player {
    constructor(world, gameMode = 'creative') {
        this.world = world;
        this.gameMode = gameMode;
        this.inventory = new Inventory();

        // Position
        this.position = new THREE.Vector3(50, 150, 50);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);

        // Physics
        this.gravity = -0.015;
        this.friction = 0.85;
        this.airResistance = 0.95;
        this.moveSpeed = 0.15;
        this.sprintSpeed = 0.25;
        this.jumpForce = 0.3;

        // State
        this.isGrounded = false;
        this.isSprinting = false;
        this.canJump = true;
        this.breaking = false;
        this.breakingProgress = 0;
        this.breakingBlock = null;
        this.breakingTime = 0;

        // Input
        this.inputs = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false,
            jump: false
        };

        // Camera (first-person)
        this.yaw = 0;
        this.pitch = 0;
        this.direction = new THREE.Vector3(0, 0, -1);
    }

    update() {
        // Apply gravity
        this.velocity.y += this.gravity;

        // Ground detection (raycast down)
        this.isGrounded = this.checkCollision(this.position.x, this.position.y - 1.8, this.position.z);

        // Movement
        const moveDirection = new THREE.Vector3();

        if (this.inputs.forward) moveDirection.z -= 1;
        if (this.inputs.backward) moveDirection.z += 1;
        if (this.inputs.left) moveDirection.x -= 1;
        if (this.inputs.right) moveDirection.x += 1;

        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
            const speed = this.inputs.sprint ? this.sprintSpeed : this.moveSpeed;
            
            // Apply movement relative to camera direction
            const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
            const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

            this.velocity.x = (forward.x * moveDirection.z + right.x * moveDirection.x) * speed;
            this.velocity.z = (forward.z * moveDirection.z + right.z * moveDirection.x) * speed;
        }

        // Jump
        if (this.inputs.jump && this.isGrounded && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.canJump = false;
        }
        if (!this.inputs.jump) {
            this.canJump = true;
        }

        // Creative mode flight
        if (this.gameMode === 'creative') {
            if (this.inputs.jump) {
                this.velocity.y = this.moveSpeed * 0.5;
            }
        }

        // Update position
        this.position.add(this.velocity);

        // Collision detection (simple AABB)
        this.handleCollisions();

        // Friction
        if (this.isGrounded) {
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        } else {
            this.velocity.x *= this.airResistance;
            this.velocity.z *= this.airResistance;
        }
    }

    checkCollision(x, y, z) {
        const blockX = Math.floor(x);
        const blockY = Math.floor(y);
        const blockZ = Math.floor(z);

        const block = this.world.getBlock(blockX, blockY, blockZ);
        return block !== BLOCK_TYPES.AIR && block !== BLOCK_TYPES.WATER;
    }

    handleCollisions() {
        // Simple collision response
        const boundingBox = 0.3;

        // X-axis collision
        if (this.checkCollision(this.position.x + boundingBox, this.position.y, this.position.z) ||
            this.checkCollision(this.position.x - boundingBox, this.position.y, this.position.z)) {
            this.velocity.x = 0;
            this.position.x -= this.velocity.x;
        }

        // Z-axis collision
        if (this.checkCollision(this.position.x, this.position.y, this.position.z + boundingBox) ||
            this.checkCollision(this.position.x, this.position.y, this.position.z - boundingBox)) {
            this.velocity.z = 0;
            this.position.z -= this.velocity.z;
        }

        // Y-axis collision
        if (this.checkCollision(this.position.x, this.position.y + 1.8, this.position.z)) {
            this.velocity.y = 0;
        }
        if (this.checkCollision(this.position.x, this.position.y - 1.8, this.position.z)) {
            this.velocity.y = 0;
            this.isGrounded = true;
        }
    }

    setCameraDirection() {
        this.direction.x = Math.sin(this.yaw) * Math.cos(this.pitch);
        this.direction.y = Math.sin(this.pitch);
        this.direction.z = Math.cos(this.yaw) * Math.cos(this.pitch);
        this.direction.normalize();
    }

    getTargetBlock(maxDistance = 5) {
        this.setCameraDirection();
        
        let x = this.position.x;
        let y = this.position.y;
        let z = this.position.z;

        for (let i = 0; i < maxDistance * 10; i++) {
            x += this.direction.x * 0.1;
            y += this.direction.y * 0.1;
            z += this.direction.z * 0.1;

            const blockX = Math.floor(x);
            const blockY = Math.floor(y);
            const blockZ = Math.floor(z);

            const block = this.world.getBlock(blockX, blockY, blockZ);
            if (block !== BLOCK_TYPES.AIR) {
                return { x: blockX, y: blockY, z: blockZ, block };
            }
        }

        return null;
    }

    breakBlock(targetBlock) {
        if (!targetBlock) return;

        const block = this.world.getBlock(targetBlock.x, targetBlock.y, targetBlock.z);
        if (!isBlockBreakable(block)) return;

        if (this.breakingBlock !== targetBlock) {
            this.breakingBlock = targetBlock;
            this.breakingTime = 0;
            this.breakingProgress = 0;
        }

        this.breakingTime += 0.016; // Assuming 60fps
        this.breakingProgress = this.breakingTime / getBreakTime(block);

        if (this.breakingProgress >= 1) {
            this.world.setBlock(targetBlock.x, targetBlock.y, targetBlock.z, BLOCK_TYPES.AIR);
            
            // Add drops to inventory
            const drops = getBlockDrops(block);
            drops.forEach(dropType => {
                this.inventory.addBlock(dropType);
            });

            this.breakingBlock = null;
            this.breakingTime = 0;
            this.breaking = false;
        }
    }

    placeBlock(targetBlock) {
        if (!targetBlock) return;

        const item = this.inventory.getActiveItem();
        if (!item) return;

        // Calculate block position based on face
        let placeX = targetBlock.x;
        let placeY = targetBlock.y;
        let placeZ = targetBlock.z;

        // Place above the target block
        placeY += 1;

        // Check if position is valid
        const existingBlock = this.world.getBlock(placeX, placeY, placeZ);
        if (existingBlock === BLOCK_TYPES.AIR) {
            this.world.setBlock(placeX, placeY, placeZ, item.blockType);
            this.inventory.removeBlock(1);
        }
    }
}
