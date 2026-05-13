// Block System - Defines all block types and their properties

const BLOCK_TYPES = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    OAK_LOG: 4,
    OAK_LEAVES: 5,
    SAND: 6,
    WATER: 7,
    GRAVEL: 8,
    COAL_ORE: 9,
    IRON_ORE: 10,
    DIAMOND_ORE: 11,
    GOLD_ORE: 12
};

const BLOCK_PROPERTIES = {
    [BLOCK_TYPES.AIR]: {
        name: 'Air',
        color: 0x87ceeb,
        breakable: false,
        breakTime: 0,
        emoji: '  '
    },
    [BLOCK_TYPES.STONE]: {
        name: 'Stone',
        color: 0x808080,
        breakable: true,
        breakTime: 0.75,
        emoji: '⬜',
        drops: [BLOCK_TYPES.STONE]
    },
    [BLOCK_TYPES.DIRT]: {
        name: 'Dirt',
        color: 0x8B7355,
        breakable: true,
        breakTime: 0.5,
        emoji: '🟫',
        drops: [BLOCK_TYPES.DIRT]
    },
    [BLOCK_TYPES.GRASS]: {
        name: 'Grass',
        color: 0x7db82b,
        breakable: true,
        breakTime: 0.5,
        emoji: '🟩',
        drops: [BLOCK_TYPES.DIRT]
    },
    [BLOCK_TYPES.OAK_LOG]: {
        name: 'Oak Log',
        color: 0x654321,
        breakable: true,
        breakTime: 1.0,
        emoji: '🪵',
        drops: [BLOCK_TYPES.OAK_LOG]
    },
    [BLOCK_TYPES.OAK_LEAVES]: {
        name: 'Oak Leaves',
        color: 0x22c414,
        breakable: true,
        breakTime: 0.2,
        emoji: '🍃',
        drops: []
    },
    [BLOCK_TYPES.SAND]: {
        name: 'Sand',
        color: 0xf4a460,
        breakable: true,
        breakTime: 0.5,
        emoji: '🟨',
        drops: [BLOCK_TYPES.SAND]
    },
    [BLOCK_TYPES.WATER]: {
        name: 'Water',
        color: 0x4169e1,
        breakable: false,
        breakTime: 0,
        emoji: '💧',
        liquid: true
    },
    [BLOCK_TYPES.GRAVEL]: {
        name: 'Gravel',
        color: 0x909090,
        breakable: true,
        breakTime: 0.6,
        emoji: '⬜',
        drops: [BLOCK_TYPES.GRAVEL]
    },
    [BLOCK_TYPES.COAL_ORE]: {
        name: 'Coal Ore',
        color: 0x1a1a1a,
        breakable: true,
        breakTime: 1.25,
        emoji: '⬛',
        drops: []
    },
    [BLOCK_TYPES.IRON_ORE]: {
        name: 'Iron Ore',
        color: 0xb8860b,
        breakable: true,
        breakTime: 1.5,
        emoji: '⬜',
        drops: []
    },
    [BLOCK_TYPES.DIAMOND_ORE]: {
        name: 'Diamond Ore',
        color: 0x00d9ff,
        breakable: true,
        breakTime: 3.0,
        emoji: '💎',
        drops: []
    },
    [BLOCK_TYPES.GOLD_ORE]: {
        name: 'Gold Ore',
        color: 0xffd700,
        breakable: true,
        breakTime: 2.0,
        emoji: '⭐',
        drops: []
    }
};

// Get block properties
function getBlockProperties(blockType) {
    return BLOCK_PROPERTIES[blockType] || BLOCK_PROPERTIES[BLOCK_TYPES.AIR];
}

// Get block color
function getBlockColor(blockType) {
    return getBlockProperties(blockType).color;
}

// Get block name
function getBlockName(blockType) {
    return getBlockProperties(blockType).name;
}

// Check if block is breakable
function isBlockBreakable(blockType) {
    return getBlockProperties(blockType).breakable;
}

// Get break time for block
function getBreakTime(blockType) {
    return getBlockProperties(blockType).breakTime;
}

// Get drops for block
function getBlockDrops(blockType) {
    return getBlockProperties(blockType).drops || [];
}
