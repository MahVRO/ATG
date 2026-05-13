/**
 * Chunk Manager
 * Handles chunk loading, unloading, and mesh management
 */

class ChunkManager {
    constructor(renderer, renderDistance = 8) {
        this.renderer = renderer;
        this.renderDistance = renderDistance;
        this.chunks = new Map();
        this.terrain = new TerrainGenerator(12345);
        this.meshBuilder = new ChunkMeshBuilder(renderer);
        this.rebuildQueue = [];
        this.loadedChunkKeys = new Set();
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    getOrCreateChunk(x, z) {
        const key = this.getChunkKey(x, z);
        
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(x, z);
            this.terrain.generateChunk(chunk);
            this.chunks.set(key, chunk);
            this.rebuildQueue.push(chunk);
        }

        return this.chunks.get(key);
    }

    updatePlayerPosition(playerX, playerZ) {
        const chunkX = Math.floor(playerX / CHUNK_SIZE);
        const chunkZ = Math.floor(playerZ / CHUNK_SIZE);

        const toLoad = [];
        const toUnload = [];

        // Find chunks to load
        for (let x = chunkX - this.renderDistance; x <= chunkX + this.renderDistance; x++) {
            for (let z = chunkZ - this.renderDistance; z <= chunkZ + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                if (!this.loadedChunkKeys.has(key)) {
                    toLoad.push({ x, z });
                    this.loadedChunkKeys.add(key);
                }
            }
        }

        // Find chunks to unload
        for (const key of this.loadedChunkKeys) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > this.renderDistance || Math.abs(z - chunkZ) > this.renderDistance) {
                toUnload.push({ x, z, key });
            }
        }

        // Load new chunks
        for (const { x, z } of toLoad) {
            this.getOrCreateChunk(x, z);
        }

        // Unload distant chunks
        for (const { x, z, key } of toUnload) {
            this.unloadChunk(x, z, key);
        }
    }

    unloadChunk(x, z, key) {
        const chunk = this.chunks.get(key);
        if (chunk) {
            chunk.disposeMesh();
            this.renderer.getScene().remove(chunk.mesh);
            this.chunks.delete(key);
        }
        this.loadedChunkKeys.delete(key);
    }

    updateChunkMeshes() {
        const processed = Math.min(this.rebuildQueue.length, 1); // Build one chunk per frame

        for (let i = 0; i < processed; i++) {
            const chunk = this.rebuildQueue.shift();
            if (chunk && chunk.meshDirty) {
                chunk.disposeMesh();
                const mesh = this.meshBuilder.buildChunkMesh(chunk, this);
                if (mesh) {
                    chunk.mesh = mesh;
                    this.renderer.getScene().add(mesh);
                }
                chunk.meshDirty = false;
            }
        }
    }

    getChunk(x, z) {
        const key = this.getChunkKey(x, z);
        return this.chunks.get(key);
    }

    setBlock(worldX, worldY, worldZ, blockId) {
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const localX = worldX - chunkX * CHUNK_SIZE;
        const localZ = worldZ - chunkZ * CHUNK_SIZE;

        const chunk = this.getOrCreateChunk(chunkX, chunkZ);
        chunk.setBlock(localX, worldY, localZ, blockId);
        this.rebuildQueue.push(chunk);

        // Mark adjacent chunks as dirty
        if (localX === 0 && chunkX > 0) {
            const adjChunk = this.getChunk(chunkX - 1, chunkZ);
            if (adjChunk) this.rebuildQueue.push(adjChunk);
        }
        if (localX === CHUNK_SIZE - 1 && chunkX < 100) {
            const adjChunk = this.getChunk(chunkX + 1, chunkZ);
            if (adjChunk) this.rebuildQueue.push(adjChunk);
        }
        if (localZ === 0 && chunkZ > 0) {
            const adjChunk = this.getChunk(chunkX, chunkZ - 1);
            if (adjChunk) this.rebuildQueue.push(adjChunk);
        }
        if (localZ === CHUNK_SIZE - 1 && chunkZ < 100) {
            const adjChunk = this.getChunk(chunkX, chunkZ + 1);
            if (adjChunk) this.rebuildQueue.push(adjChunk);
        }
    }

    getBlock(worldX, worldY, worldZ) {
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const localX = worldX - chunkX * CHUNK_SIZE;
        const localZ = worldZ - chunkZ * CHUNK_SIZE;

        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) return 0;

        return chunk.getBlock(localX, worldY, localZ);
    }

    dispose() {
        for (const chunk of this.chunks.values()) {
            chunk.disposeMesh();
        }
        this.chunks.clear();
        this.loadedChunkKeys.clear();
    }
}
