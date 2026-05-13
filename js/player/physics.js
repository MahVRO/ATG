/**
 * Player Physics and Movement
 */

class PlayerPhysics {
    constructor() {
        this.position = new THREE.Vector3(0, 64, 0);
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();

        this.gravity = 0.006;
        this.friction = 0.85;
        this.airResistance = 0.95;

        this.moveSpeed = 0.08;
        this.sprintSpeed = 0.12;
        this.jumpForce = 0.12;

        this.isGrounded = false;
        this.isFlying = false;
        this.isSprinting = false;

        this.playerHeight = 1.8;
        this.playerWidth = 0.6;

        this.keyState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            shift: false
        };
    }

    update(chunkManager) {
        if (this.isFlying) {
            this.updateFlying();
        } else {
            this.updateWalking(chunkManager);
        }

        this.position.add(this.velocity);

        // Prevent falling too far
        if (this.position.y < -100) {
            this.position.y = 64;
            this.velocity.set(0, 0, 0);
        }

        // Update grounded state
        this.checkGrounded(chunkManager);
    }

    updateWalking(chunkManager) {
        const moveDir = new THREE.Vector3();
        const speed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;

        if (this.keyState.forward) moveDir.z -= speed;
        if (this.keyState.backward) moveDir.z += speed;
        if (this.keyState.left) moveDir.x -= speed;
        if (this.keyState.right) moveDir.x += speed;

        // Rotate by camera (get camera rotation safely)
        if (window.cameraController && window.cameraController.camera) {
            const cameraYaw = window.cameraController.camera.rotation.y;
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        }

        this.velocity.x = moveDir.x;
        this.velocity.z = moveDir.z;

        // Jump
        if (this.keyState.jump && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        // Apply gravity
        this.velocity.y -= this.gravity;

        // Collision
        this.handleCollisions(chunkManager);
    }

    updateFlying() {
        const moveDir = new THREE.Vector3();
        const speed = this.isSprinting ? this.sprintSpeed * 2 : this.moveSpeed;

        if (this.keyState.forward) moveDir.z -= speed;
        if (this.keyState.backward) moveDir.z += speed;
        if (this.keyState.left) moveDir.x -= speed;
        if (this.keyState.right) moveDir.x += speed;
        if (this.keyState.jump) moveDir.y += speed;
        if (this.keyState.shift) moveDir.y -= speed;

        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), window.cameraController.camera.rotation.y);

        this.velocity.copy(moveDir);
    }

    checkGrounded(chunkManager) {
        const checkPoints = [
            [0, 0],
            [this.playerWidth / 2, 0],
            [-this.playerWidth / 2, 0],
            [0, this.playerWidth / 2],
            [0, -this.playerWidth / 2]
        ];

        this.isGrounded = false;

        for (const [ox, oz] of checkPoints) {
            const x = Math.floor(this.position.x + ox);
            const y = Math.floor(this.position.y - 0.1);
            const z = Math.floor(this.position.z + oz);

            const blockId = chunkManager.getBlock(x, y, z);
            if (blockId !== 0 && BLOCK_REGISTRY.isCollidable(blockId)) {
                this.isGrounded = true;
                break;
            }
        }

        if (!this.isGrounded && this.velocity.y === 0) {
            this.velocity.y = -0.001;
        }
    }

    handleCollisions(chunkManager) {
        const checkPoints = [
            [this.playerWidth / 2, 0],
            [-this.playerWidth / 2, 0],
            [0, this.playerWidth / 2],
            [0, -this.playerWidth / 2],
            [0, 0]
        ];

        for (let i = 0; i < 3; i++) {
            for (const [ox, oz] of checkPoints) {
                const x = Math.floor(this.position.x + ox + this.velocity.x);
                const y = Math.floor(this.position.y);
                const z = Math.floor(this.position.z + oz + this.velocity.z);

                const blockId = chunkManager.getBlock(x, y, z);
                if (blockId !== 0 && BLOCK_REGISTRY.isCollidable(blockId)) {
                    this.velocity.x *= -0.5;
                    this.velocity.z *= -0.5;
                }
            }

            // Check ceiling
            const headX = Math.floor(this.position.x);
            const headY = Math.floor(this.position.y + this.playerHeight + this.velocity.y);
            const headZ = Math.floor(this.position.z);

            const headBlock = chunkManager.getBlock(headX, headY, headZ);
            if (headBlock !== 0 && BLOCK_REGISTRY.isCollidable(headBlock)) {
                this.velocity.y *= -0.5;
            }
        }
    }

    setFlying(flying) {
        this.isFlying = flying;
        if (flying) {
            this.velocity.set(0, 0, 0);
        }
    }

    getEyePosition() {
        return new THREE.Vector3(
            this.position.x,
            this.position.y + this.playerHeight * 0.9,
            this.position.z
        );
    }
}
