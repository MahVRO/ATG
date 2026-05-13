/**
 * Block Interaction System
 * Handles breaking and placing blocks
 */

class BlockInteraction {
    constructor() {
        this.maxDistance = 5;
        this.breakProgress = new Map();
        this.currentlyBreaking = null;
        this.breakTime = 0;
        this.raycaster = new THREE.Raycaster();
    }

    raycast(camera, chunkManager) {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

        const start = camera.position.clone();
        const direction = this.raycaster.ray.direction.normalize();

        const step = 0.1;
        let distance = 0;

        while (distance < this.maxDistance) {
            const checkPoint = start.clone().addScaledVector(direction, distance);
            
            const blockId = chunkManager.getBlock(
                Math.floor(checkPoint.x),
                Math.floor(checkPoint.y),
                Math.floor(checkPoint.z)
            );

            if (blockId !== 0 && BLOCK_REGISTRY.isCollidable(blockId)) {
                return {
                    blockId,
                    position: {
                        x: Math.floor(checkPoint.x),
                        y: Math.floor(checkPoint.y),
                        z: Math.floor(checkPoint.z)
                    },
                    distance
                };
            }

            distance += step;
        }

        return null;
    }

    breakBlock(camera, chunkManager, creative = false) {
        const target = this.raycast(camera, chunkManager);
        if (!target) return false;

        if (creative) {
            chunkManager.setBlock(target.position.x, target.position.y, target.position.z, 0);
            return true;
        }

        // Survival mode - track break progress
        const key = `${target.position.x},${target.position.y},${target.position.z}`;
        
        if (key !== this.currentlyBreaking) {
            this.breakProgress.clear();
            this.currentlyBreaking = key;
            this.breakTime = 0;
        }

        this.breakTime += 16; // ~60fps

        const block = BLOCK_REGISTRY.getBlock(target.blockId);
        const breakTime = block ? (block.breakTime || 1) * 1000 : 1000;

        if (this.breakTime >= breakTime) {
            chunkManager.setBlock(target.position.x, target.position.y, target.position.z, 0);
            this.breakProgress.delete(key);
            this.currentlyBreaking = null;
            this.breakTime = 0;
            return true;
        }

        this.breakProgress.set(key, this.breakTime / breakTime);
        return false;
    }

    placeBlock(camera, chunkManager, blockId, creative = false) {
        const target = this.raycast(camera, chunkManager);
        if (!target) return false;

        // Place block adjacent to target
        const direction = this.raycaster.ray.direction.normalize();
        const placementDist = target.distance + 0.1;
        const placePoint = camera.position.clone().addScaledVector(direction, placementDist);

        const placeX = Math.floor(placePoint.x);
        const placeY = Math.floor(placePoint.y);
        const placeZ = Math.floor(placePoint.z);

        // Don't place inside player
        const playerBounds = {
            x: [camera.position.x - 0.3, camera.position.x + 0.3],
            y: [camera.position.y - 1.8, camera.position.y],
            z: [camera.position.z - 0.3, camera.position.z + 0.3]
        };

        if (placeX >= playerBounds.x[0] && placeX <= playerBounds.x[1] &&
            placeY >= playerBounds.y[0] && placeY <= playerBounds.y[1] &&
            placeZ >= playerBounds.z[0] && placeZ <= playerBounds.z[1]) {
            return false;
        }

        chunkManager.setBlock(placeX, placeY, placeZ, blockId);
        return true;
    }

    highlightBlock(camera, chunkManager) {
        return this.raycast(camera, chunkManager);
    }

    getBreakProgress(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.breakProgress.get(key) || 0;
    }
}
