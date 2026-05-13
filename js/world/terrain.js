/**
 * Terrain Generation
 * Procedural world generation using Perlin noise
 */

class TerrainGenerator {
    constructor(seed = 12345) {
        this.perlin = new PerlinNoise(seed);
        this.seed = seed;
    }

    generateChunk(chunk) {
        const chunkX = chunk.x;
        const chunkZ = chunk.z;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const worldX = chunk.getWorldX(lx);
                    const worldZ = chunk.getWorldZ(lz);

                    const blockId = this.getBlockAtPosition(worldX, y, worldZ);
                    chunk.setBlock(lx, y, lz, blockId);
                }
            }
        }

        this.generateTrees(chunk);
        chunk.loaded = true;
    }

    getBlockAtPosition(x, y, z) {
        // Normalized noise values
        const scale = 100;
        const terrainNoise = this.perlin.octavePerlin(x / scale, z / scale, 0, 4, 0.5, 2);
        
        // Height calculation
        const baseHeight = 40;
        const terrainHeight = Math.floor(baseHeight + terrainNoise * 30);

        // Caves
        const caveNoise = this.perlin.octavePerlin(x / 30, y / 30, z / 30, 3, 0.5, 2);
        if (y > 5 && y < terrainHeight - 5 && caveNoise > 0.4) {
            return 0; // Air (cave)
        }

        // Water level
        if (y <= 32) {
            return BLOCK_REGISTRY.getBlockId('water');
        }

        // Terrain layers
        if (y > terrainHeight) {
            return 0; // Air
        }

        if (y === terrainHeight) {
            // Surface layer
            const biomeNoise = this.perlin.octavePerlin(x / 200, z / 200, 0, 2, 0.5, 2);
            
            if (y <= 32) return BLOCK_REGISTRY.getBlockId('sand_block');
            if (biomeNoise > 0.6) return BLOCK_REGISTRY.getBlockId('grass_soil');
            if (biomeNoise > 0.2) return BLOCK_REGISTRY.getBlockId('soil');
            return BLOCK_REGISTRY.getBlockId('grass_soil');
        }

        if (y > terrainHeight - 3) {
            return BLOCK_REGISTRY.getBlockId('soil');
        }

        // Stone layers with ore
        const oreNoise = this.perlin.octavePerlin(x / 50, y / 50, z / 50, 2, 0.5, 2);

        if (y < 20) {
            if (oreNoise > 0.85) return BLOCK_REGISTRY.getBlockId('coal_ore');
            if (oreNoise > 0.78) return BLOCK_REGISTRY.getBlockId('iron_ore');
            if (oreNoise > 0.65) return BLOCK_REGISTRY.getBlockId('gravel');
        } else if (y < 40) {
            if (oreNoise > 0.88) return BLOCK_REGISTRY.getBlockId('coal_ore');
            if (oreNoise > 0.80) return BLOCK_REGISTRY.getBlockId('iron_ore');
        }

        return BLOCK_REGISTRY.getBlockId('stone');
    }

    generateTrees(chunk) {
        const scale = 0.05;
        const spacing = 8;

        for (let lz = 0; lz < CHUNK_SIZE; lz += spacing) {
            for (let lx = 0; lx < CHUNK_SIZE; lx += spacing) {
                const worldX = chunk.getWorldX(lx);
                const worldZ = chunk.getWorldZ(lz);

                const treeNoise = this.perlin.octavePerlin(worldX * scale, worldZ * scale, 1000, 1, 0.5, 2);

                if (treeNoise > 0.6) {
                    // Find ground level
                    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
                        const block = chunk.getBlock(lx, y, lz);
                        if (block !== 0 && BLOCK_REGISTRY.isBlock(block)) {
                            if (y + 1 < CHUNK_HEIGHT) {
                                this.generateTree(chunk, lx, y + 1, lz);
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    generateTree(chunk, lx, y, lz) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        const canopyRadius = 2;

        // Trunk
        for (let i = 0; i < treeHeight; i++) {
            if (y + i < CHUNK_HEIGHT) {
                chunk.setBlock(lx, y + i, lz, BLOCK_REGISTRY.getBlockId('wood_log'));
            }
        }

        // Leaves
        const leafStart = y + Math.max(2, treeHeight - 3);
        for (let oy = 0; oy < 4; oy++) {
            for (let ox = -canopyRadius; ox <= canopyRadius; ox++) {
                for (let oz = -canopyRadius; oz <= canopyRadius; oz++) {
                    const dist = Math.sqrt(ox * ox + oz * oz);
                    if (dist < canopyRadius + 0.5) {
                        const ly = leafStart + oy;
                        if (ly < CHUNK_HEIGHT && ly > y) {
                            const leafX = lx + ox;
                            const leafZ = lz + oz;
                            if (leafX >= 0 && leafX < CHUNK_SIZE && leafZ >= 0 && leafZ < CHUNK_SIZE) {
                                if (chunk.getBlock(leafX, ly, leafZ) === 0) {
                                    chunk.setBlock(leafX, ly, leafZ, BLOCK_REGISTRY.getBlockId('leaves'));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
