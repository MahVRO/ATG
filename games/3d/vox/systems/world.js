// World System - Chunk generation, loading, and management

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 256;
const RENDER_DISTANCE = 3;

class WorldGenerator {
    constructor(seed = 12345) {
        this.seed = seed;
    }

    // Simple Perlin-like noise function
    noise(x, y, z) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
        return n - Math.floor(n);
    }

    // Multi-octave Perlin noise for smoother terrain
    perlinNoise(x, y, z, octaves = 3) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }

    // Generate a block at coordinates
    getBlock(x, y, z) {
        // Bedrock at bottom
        if (y < 2) return BLOCK_TYPES.BEDROCK || BLOCK_TYPES.STONE;

        const heightLevel = 100;
        const terrainNoise = this.perlinNoise(x * 0.1, z * 0.1, this.seed, 4);
        const groundHeight = heightLevel + terrainNoise * 30;

        if (y > groundHeight + 5) return BLOCK_TYPES.AIR;

        // Generate terrain layers
        if (y > groundHeight + 2) {
            return BLOCK_TYPES.AIR;
        } else if (y > groundHeight) {
            // Surface
            if (terrainNoise > 0.7) {
                return BLOCK_TYPES.SAND;
            }
            return BLOCK_TYPES.GRASS;
        } else if (y > groundHeight - 3) {
            return BLOCK_TYPES.DIRT;
        } else if (y > groundHeight - 10) {
            // Ore generation
            const oreNoise = this.perlinNoise(x * 0.2, y * 0.1, z * 0.2, 2);
            if (oreNoise > 0.85) return BLOCK_TYPES.COAL_ORE;
            if (oreNoise > 0.9) return BLOCK_TYPES.IRON_ORE;
            if (oreNoise > 0.95) return BLOCK_TYPES.DIAMOND_ORE;
            return BLOCK_TYPES.STONE;
        } else {
            return BLOCK_TYPES.STONE;
        }
    }

    // Generate trees
    generateTrees(chunkX, chunkZ, blocks) {
        const treeChance = 0.02;
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const x = chunkX * CHUNK_SIZE + lx;
                const z = chunkZ * CHUNK_SIZE + lz;

                if (this.noise(x * 13, z * 13, this.seed * 7) < treeChance) {
                    // Find ground
                    for (let y = 120; y > 80; y--) {
                        if (blocks[y] && blocks[y][lx] && blocks[y][lx][lz] === BLOCK_TYPES.GRASS) {
                            this.generateTree(x, y + 1, z, lx, lz, blocks);
                            break;
                        }
                    }
                }
            }
        }
    }

    generateTree(x, y, z, lx, lz, blocks) {
        const height = 5 + Math.floor(this.noise(x, y, z) * 3);
        
        // Tree trunk
        for (let i = 0; i < height; i++) {
            if (y + i < CHUNK_HEIGHT) {
                blocks[y + i] = blocks[y + i] || {};
                blocks[y + i][lx] = blocks[y + i][lx] || {};
                blocks[y + i][lx][lz] = BLOCK_TYPES.OAK_LOG;
            }
        }

        // Tree canopy
        const canopyTop = y + height + 2;
        for (let cx = -2; cx <= 2; cx++) {
            for (let cz = -2; cz <= 2; cz++) {
                for (let cy = 0; cy < 4; cy++) {
                    const dist = Math.sqrt(cx * cx + cz * cz);
                    if (dist < 2.5 && canopyTop - cy < CHUNK_HEIGHT && canopyTop - cy >= 0) {
                        blocks[canopyTop - cy] = blocks[canopyTop - cy] || {};
                        blocks[canopyTop - cy][lx + cx] = blocks[canopyTop - cy][lx + cx] || {};
                        blocks[canopyTop - cy][lx + cx][lz + cz] = BLOCK_TYPES.OAK_LEAVES;
                    }
                }
            }
        }
    }
}

class Chunk {
    constructor(x, z, generator) {
        this.x = x;
        this.z = z;
        this.blocks = {};
        this.mesh = null;
        this.dirty = true;
        this.generator = generator;
        this.generateBlocks();
    }

    generateBlocks() {
        // Generate 3D terrain data
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            this.blocks[y] = {};
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                this.blocks[y][lx] = {};
                for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                    const worldX = this.x * CHUNK_SIZE + lx;
                    const worldZ = this.z * CHUNK_SIZE + lz;
                    this.blocks[y][lx][lz] = this.generator.getBlock(worldX, y, worldZ);
                }
            }
        }

        // Generate trees
        this.generator.generateTrees(this.x, this.z, this.blocks);
    }

    getBlock(lx, y, lz) {
        if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            return BLOCK_TYPES.AIR;
        }
        return this.blocks[y] && this.blocks[y][lx] && this.blocks[y][lx][lz] ? this.blocks[y][lx][lz] : BLOCK_TYPES.AIR;
    }

    setBlock(lx, y, lz, blockType) {
        if (lx >= 0 && lx < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && lz >= 0 && lz < CHUNK_SIZE) {
            this.blocks[y] = this.blocks[y] || {};
            this.blocks[y][lx] = this.blocks[y][lx] || {};
            this.blocks[y][lx][lz] = blockType;
            this.dirty = true;
        }
    }
}

class World {
    constructor(seed = 12345) {
        this.chunks = {};
        this.generator = new WorldGenerator(seed);
        this.chunkQueue = [];
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    getChunk(x, z, create = true) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks[key] && create) {
            this.chunks[key] = new Chunk(x, z, this.generator);
        }
        return this.chunks[key];
    }

    getBlock(x, y, z) {
        if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;
        
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;

        const chunk = this.getChunk(chunkX, chunkZ, true);
        return chunk.getBlock(localX, y, localZ);
    }

    setBlock(x, y, z, blockType) {
        if (y < 0 || y >= CHUNK_HEIGHT) return false;

        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;

        const chunk = this.getChunk(chunkX, chunkZ, true);
        chunk.setBlock(localX, y, localZ, blockType);
        return true;
    }

    getLoadedChunks(playerChunkX, playerChunkZ) {
        const chunks = [];
        for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
            for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
                chunks.push(this.getChunk(x, z, true));
            }
        }
        return chunks;
    }
}
