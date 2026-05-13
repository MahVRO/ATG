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
        if (y < 2) return BLOCK_TYPES.STONE;

        const heightLevel = 60;
        const terrainNoise = this.perlinNoise(x * 0.08, z * 0.08, this.seed, 4);
        const groundHeight = heightLevel + terrainNoise * 25;

        if (y > groundHeight + 10) return BLOCK_TYPES.AIR;

        // Generate terrain layers
        if (y > groundHeight) {
            return BLOCK_TYPES.AIR;
        } else if (y > groundHeight - 1) {
            // Surface
            if (terrainNoise > 0.6) {
                return BLOCK_TYPES.SAND;
            }
            return BLOCK_TYPES.GRASS;
        } else if (y > groundHeight - 4) {
            return BLOCK_TYPES.DIRT;
        } else if (y > 10) {
            // Ore generation
            const oreNoise = this.perlinNoise(x * 0.15, y * 0.08, z * 0.15, 2);
            if (oreNoise > 0.92) return BLOCK_TYPES.DIAMOND_ORE;
            if (oreNoise > 0.88) return BLOCK_TYPES.GOLD_ORE;
            if (oreNoise > 0.85) return BLOCK_TYPES.IRON_ORE;
            if (oreNoise > 0.8) return BLOCK_TYPES.COAL_ORE;
            return BLOCK_TYPES.STONE;
        } else {
            return BLOCK_TYPES.STONE;
        }
    }

    // Generate trees
    generateTrees(chunkX, chunkZ, blocks) {
        const treeChance = 0.01;
        for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
            for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
                const x = chunkX * CHUNK_SIZE + lx;
                const z = chunkZ * CHUNK_SIZE + lz;

                if (this.noise(x * 17, z * 17, this.seed * 13) < treeChance) {
                    // Find ground
                    let groundY = -1;
                    for (let y = 80; y > 50; y--) {
                        const block = blocks[y] && blocks[y][lx] && blocks[y][lx][lz];
                        if (block && block !== BLOCK_TYPES.AIR) {
                            groundY = y + 1;
                            break;
                        }
                    }
                    
                    if (groundY > 0) {
                        this.generateTree(x, groundY, z, lx, lz, blocks);
                    }
                }
            }
        }
    }

    generateTree(x, y, z, lx, lz, blocks) {
        const height = 4 + Math.floor(this.noise(x, y, z) * 3);
        
        // Tree trunk
        for (let i = 0; i < height && y + i < CHUNK_HEIGHT; i++) {
            blocks[y + i] = blocks[y + i] || {};
            blocks[y + i][lx] = blocks[y + i][lx] || {};
            blocks[y + i][lx][lz] = BLOCK_TYPES.OAK_LOG;
        }

        // Tree canopy
        const canopyStart = y + height;
        const canopyRadius = 2;
        for (let cy = 0; cy < 4; cy++) {
            for (let cx = -canopyRadius; cx <= canopyRadius; cx++) {
                for (let cz = -canopyRadius; cz <= canopyRadius; cz++) {
                    const dist = Math.sqrt(cx * cx + cz * cz);
                    const canopyY = canopyStart + cy;
                    if (dist < canopyRadius && canopyY < CHUNK_HEIGHT) {
                        const glx = lx + cx;
                        const glz = lz + cz;
                        if (glx >= 0 && glx < CHUNK_SIZE && glz >= 0 && glz < CHUNK_SIZE) {
                            blocks[canopyY] = blocks[canopyY] || {};
                            blocks[canopyY][glx] = blocks[canopyY][glx] || {};
                            blocks[canopyY][glx][glz] = BLOCK_TYPES.OAK_LEAVES;
                        }
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
