/**
 * Chunk Data Structure
 * Stores block data for a 16x128x16 region
 */

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 128;

class Chunk {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.data = new Uint32Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
        this.meshDirty = true;
        this.loaded = false;
    }

    setBlock(lx, y, lz, blockId) {
        if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            return;
        }
        const index = (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
        this.data[index] = blockId;
        this.meshDirty = true;
    }

    getBlock(lx, y, lz) {
        if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            return 0; // Air
        }
        const index = (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
        return this.data[index];
    }

    fill(blockId) {
        this.data.fill(blockId);
        this.meshDirty = true;
    }

    reset() {
        this.data.fill(0);
        this.meshDirty = true;
        this.loaded = false;
    }

    getWorldX(lx) {
        return this.x * CHUNK_SIZE + lx;
    }

    getWorldZ(lz) {
        return this.z * CHUNK_SIZE + lz;
    }

    getLocalX(worldX) {
        return worldX - this.x * CHUNK_SIZE;
    }

    getLocalZ(worldZ) {
        return worldZ - this.z * CHUNK_SIZE;
    }

    disposeMesh() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}
