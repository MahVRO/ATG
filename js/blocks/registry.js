/**
 * Block Registry System
 * Defines all block types and their properties
 */

class BlockRegistry {
    constructor() {
        this.blocks = new Map();
        this.blocksByName = new Map();
        this.nextId = 0;
        this.initializeBlocks();
    }

    initializeBlocks() {
        // Air (always ID 0)
        this.registerBlock('air', {
            name: 'Air',
            transparent: true,
            collidable: false,
            lightLevel: 0,
            color: 0x87CEEB
        });

        // Natural blocks
        this.registerBlock('grass_soil', {
            name: 'Grass Soil',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x3DA043,
            breakTime: 0.6,
            breakSound: 'block_break_soil'
        });

        this.registerBlock('soil', {
            name: 'Soil',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x6B4423,
            breakTime: 0.5,
            breakSound: 'block_break_soil'
        });

        this.registerBlock('stone', {
            name: 'Stone',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x808080,
            breakTime: 1.2,
            breakSound: 'block_break_stone'
        });

        this.registerBlock('sand_block', {
            name: 'Sand Block',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0xE8D7A0,
            breakTime: 0.5,
            breakSound: 'block_break_sand'
        });

        // Wood and foliage
        this.registerBlock('wood_log', {
            name: 'Wood Log',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x6B4423,
            breakTime: 2.0,
            breakSound: 'block_break_wood'
        });

        this.registerBlock('leaves', {
            name: 'Leaves',
            transparent: true,
            collidable: false,
            lightLevel: 0,
            color: 0x228B22,
            breakTime: 0.2,
            breakSound: 'block_break_leaves',
            decays: true
        });

        // Water
        this.registerBlock('water', {
            name: 'Water',
            transparent: true,
            collidable: false,
            liquid: true,
            lightLevel: 0,
            color: 0x4169E1,
            flowing: true
        });

        // Stones and ores
        this.registerBlock('gravel', {
            name: 'Gravel',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x9A8B7E,
            breakTime: 0.6,
            breakSound: 'block_break_gravel'
        });

        this.registerBlock('coal_ore', {
            name: 'Coal Ore',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x3A3A3A,
            breakTime: 3.0,
            breakSound: 'block_break_stone'
        });

        this.registerBlock('iron_ore', {
            name: 'Iron Ore',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x9B7653,
            breakTime: 4.5,
            breakSound: 'block_break_stone'
        });

        // Decorative and special
        this.registerBlock('azure_crystal', {
            name: 'Azure Crystal',
            transparent: false,
            collidable: true,
            lightLevel: 8,
            color: 0x00BFFF,
            breakTime: 5.0,
            breakSound: 'block_break_stone',
            emissive: true
        });

        this.registerBlock('brick_block', {
            name: 'Brick Block',
            transparent: false,
            collidable: true,
            lightLevel: 0,
            color: 0x8B4513,
            breakTime: 3.0,
            breakSound: 'block_break_stone'
        });

        this.registerBlock('glass', {
            name: 'Glass',
            transparent: true,
            collidable: true,
            lightLevel: 0,
            color: 0xE6F2FF,
            breakTime: 0.3,
            breakSound: 'block_break_glass'
        });
    }

    registerBlock(id, properties) {
        const blockId = this.nextId++;
        const block = {
            id: blockId,
            stringId: id,
            ...properties
        };
        this.blocks.set(blockId, block);
        this.blocksByName.set(id, block);
        return block;
    }

    getBlock(idOrName) {
        if (typeof idOrName === 'number') {
            return this.blocks.get(idOrName);
        }
        return this.blocksByName.get(idOrName);
    }

    getBlockId(name) {
        const block = this.blocksByName.get(name);
        return block ? block.id : 0;
    }

    getAllBlocks() {
        return Array.from(this.blocks.values());
    }

    isBlock(blockId) {
        return this.blocks.has(blockId);
    }

    isTransparent(blockId) {
        const block = this.blocks.get(blockId);
        return block ? block.transparent : true;
    }

    isCollidable(blockId) {
        const block = this.blocks.get(blockId);
        return block ? block.collidable : false;
    }
}

// Global registry instance
const BLOCK_REGISTRY = new BlockRegistry();
