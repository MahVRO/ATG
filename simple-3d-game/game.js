// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9e8);
scene.fog = new THREE.Fog(0x93c6e4, 42, 118);

const BASE_FOV = 75;
const SPRINT_FOV = BASE_FOV * 1.15;

const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.05, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Noise
class PerlinNoise {
    constructor(seed = 1337) {
        this.p = new Array(512);
        const perm = new Array(256);
        for (let i = 0; i < 256; i++) perm[i] = i;
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 1664525 + 1013904223) >>> 0;
            const j = s % (i + 1);
            const t = perm[i];
            perm[i] = perm[j];
            perm[j] = t;
        }
        for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }

    grad(hash, x, y) {
        const h = hash & 3;
        if (h === 0) return x + y;
        if (h === 1) return -x + y;
        if (h === 2) return x - y;
        return -x - y;
    }

    noise(x, y) {
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = this.fade(xf);
        const v = this.fade(yf);

        const aa = this.p[this.p[xi] + yi];
        const ab = this.p[this.p[xi] + yi + 1];
        const ba = this.p[this.p[xi + 1] + yi];
        const bb = this.p[this.p[xi + 1] + yi + 1];

        const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
        const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));
        return this.lerp(v, x1, x2);
    }
}

function makeRandomSeed() {
    return Math.floor(Math.random() * 0x7fffffff);
}

function normalizeSeed(seedLike, fallback) {
    const parsed = Number.parseInt(String(seedLike), 10);
    if (!Number.isFinite(parsed)) return fallback;
    const clamped = Math.max(-2147483648, Math.min(2147483647, parsed));
    return clamped | 0;
}

let currentSeed = makeRandomSeed();
let noise = new PerlinNoise(currentSeed >>> 0);

// Lighting quality
const hemi = new THREE.HemisphereLight(0xb9dcf4, 0x6e8a60, 0.42);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4dc, 1.0);
sun.position.set(-28, 52, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 180;
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48;
sun.shadow.camera.bottom = -48;
sun.shadow.bias = -0.00008;
scene.add(sun);

const bounce = new THREE.DirectionalLight(0x8fbc70, 0.14);
bounce.position.set(20, 8, -20);
scene.add(bounce);

// World constants
const VOXEL_SIZE = 1;
const CHUNK_SIZE = 16;
const CHUNK_LOAD_RADIUS = 5;
const MAX_HEIGHT = 40;
const SEA_LEVEL = 6;
const BLOCK_INTERACT_RANGE = 4;

const BLOCK_GRASS = 1;
const BLOCK_DIRT = 2;
const BLOCK_STONE = 3;
const BLOCK_DROP_SCALE = 1 / 7;
const HOTBAR_SIZE = 9;
const HOTBAR_STACK_MAX = 64;
const DROP_PICKUP_RANGE = 0.3;
const DROP_BOB_SPEED = 3.2;
const DROP_BOB_AMPLITUDE = 0.035;
const BREAK_PARTICLE_COUNT = 12;

const solidBlocks = new Set();
const removedBlocks = new Set();
const loadedChunks = new Map();
let lastChunkX = null;
let lastChunkZ = null;
const itemDrops = [];
const dynamicBlocks = new Map();
const breakParticles = [];
const hotbarInventory = Array.from({ length: HOTBAR_SIZE }, () => ({ type: 0, count: 0 }));

const sharedVoxelGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
const sharedDropGeometry = new THREE.BoxGeometry(
    VOXEL_SIZE * BLOCK_DROP_SCALE,
    VOXEL_SIZE * BLOCK_DROP_SCALE,
    VOXEL_SIZE * BLOCK_DROP_SCALE
);
const hoverOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(sharedVoxelGeometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 })
);
hoverOutline.visible = false;
hoverOutline.scale.setScalar(1.01);
scene.add(hoverOutline);

const hoverRaycaster = new THREE.Raycaster();
hoverRaycaster.near = 0;
hoverRaycaster.far = BLOCK_INTERACT_RANGE;
const hoverRayNdc = new THREE.Vector2(0, 0);
const hoverInstanceMatrix = new THREE.Matrix4();
const hoverWorldPosition = new THREE.Vector3();
const chunkRaycastMeshes = [];
const hiddenInstanceMatrix = new THREE.Matrix4().makeTranslation(0, -9999, 0);
const hoverFaceNormal = new THREE.Vector3(0, 0, 0);
const hoverNormalMatrix = new THREE.Matrix3();
const pickupClosestPoint = new THREE.Vector3();
const hoveredBlock = {
    mesh: null,
    instanceId: -1,
    gx: 0,
    gy: 0,
    gz: 0,
    blockType: BLOCK_DIRT,
    isDynamic: false,
    distance: Infinity
};

let worldTime = 0;

function blockKey(x, y, z) {
    return `${x}|${y}|${z}`;
}

function isSolid(x, y, z) {
    return solidBlocks.has(blockKey(x, y, z));
}

function getBlockTypeName(blockType) {
    if (blockType === BLOCK_GRASS) return 'grass';
    if (blockType === BLOCK_DIRT) return 'dirt';
    if (blockType === BLOCK_STONE) return 'stone';
    return 'empty';
}

function getBreakParticleColor(blockType) {
    if (blockType === BLOCK_GRASS) return 0x79bf4c;
    if (blockType === BLOCK_DIRT) return 0x7a5d3d;
    return 0x9aa0aa;
}

function getBlockMaterial(blockType) {
    if (blockType === BLOCK_GRASS) return blockMaterials[BLOCK_GRASS];
    if (blockType === BLOCK_DIRT) return dirtMaterial;
    return stoneMaterial;
}

function chunkKey(cx, cz) {
    return `${cx}|${cz}`;
}

function worldToChunk(value) {
    return Math.floor(value / CHUNK_SIZE);
}

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function noise01(x, z) {
    return noise.noise(x, z) * 0.5 + 0.5;
}

function fbmNoise01(x, z, octaves, lacunarity, gain) {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;

    for (let i = 0; i < octaves; i++) {
        sum += noise.noise(x * frequency, z * frequency) * amplitude;
        norm += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }

    return (sum / norm) * 0.5 + 0.5;
}

function makePixelTexture(baseHex, specklesHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 16, 16);

    for (let i = 0; i < 32; i++) {
        const x = (i * 5 + 3) % 16;
        const y = (i * 9 + 7) % 16;
        ctx.fillStyle = i % 3 === 0 ? specklesHex[0] : specklesHex[1];
        ctx.fillRect(x, y, 1, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

function makeGrassSideTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    // Dirt body
    ctx.fillStyle = '#7a5d3d';
    ctx.fillRect(0, 0, 16, 16);

    // Grass cap on top rows
    ctx.fillStyle = '#67a93f';
    ctx.fillRect(0, 0, 16, 4);

    // Blend rows between grass and dirt
    ctx.fillStyle = '#5a9637';
    for (let x = 0; x < 16; x++) {
        if ((x * 11 + 7) % 6 < 2) {
            ctx.fillRect(x, 4, 1, 1);
        }
    }

    // Dirt speckles
    for (let i = 0; i < 26; i++) {
        const x = (i * 3 + 5) % 16;
        const y = ((i * 7 + 9) % 11) + 5;
        ctx.fillStyle = i % 2 === 0 ? '#6a5034' : '#876747';
        ctx.fillRect(x, y, 1, 1);
    }

    // Sparse grass speckles near top
    for (let i = 0; i < 12; i++) {
        const x = (i * 13 + 1) % 16;
        const y = (i * 5 + 1) % 4;
        ctx.fillStyle = i % 2 === 0 ? '#79bf4c' : '#4f8a2e';
        ctx.fillRect(x, y, 1, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

const grassTexture = makePixelTexture('#67a93f', ['#79bf4c', '#4f8a2e']);
const grassSideTexture = makeGrassSideTexture();
const dirtTexture = makePixelTexture('#7a5d3d', ['#6a5034', '#876747']);
const stoneTexture = makePixelTexture('#8f949d', ['#7f858d', '#a5acb5']);

const grassTopMaterial = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0xffffff, roughness: 1.0, metalness: 0.0 });
const grassSideMaterial = new THREE.MeshStandardMaterial({ map: grassSideTexture, color: 0xffffff, roughness: 1.0, metalness: 0.0 });
const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 1.0, metalness: 0.0 });
const stoneMaterial = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 1.0, metalness: 0.0 });

const blockMaterials = {
    [BLOCK_GRASS]: [
        grassSideMaterial,
        grassSideMaterial,
        grassTopMaterial,
        dirtMaterial,
        grassSideMaterial,
        grassSideMaterial
    ],
    [BLOCK_DIRT]: dirtMaterial,
    [BLOCK_STONE]: stoneMaterial
};

function addColumn(gx, gz, height, instances, chunkBlockKeys) {
    for (let gy = 0; gy < height; gy++) {
        const key = blockKey(gx, gy, gz);
        if (removedBlocks.has(key)) continue;

        let blockType = BLOCK_STONE;
        if (gy >= height - 1) blockType = BLOCK_GRASS;
        else if (gy >= height - 4) blockType = BLOCK_DIRT;

        const wx = gx + 0.5;
        const wy = gy + 0.5;
        const wz = gz + 0.5;

        instances[blockType].push(new THREE.Vector3(wx, wy, wz));
        solidBlocks.add(key);
        chunkBlockKeys.push(key);
    }
}

function getDropMaterial(blockType) {
    if (blockType === BLOCK_GRASS) return grassTopMaterial;
    if (blockType === BLOCK_DIRT) return dirtMaterial;
    return stoneMaterial;
}

function createDynamicBlock(gx, gy, gz, blockType) {
    const mesh = new THREE.Mesh(sharedVoxelGeometry, getBlockMaterial(blockType));
    mesh.position.set(gx + 0.5, gy + 0.5, gz + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.blockType = blockType;
    mesh.userData.isDynamicBlock = true;
    mesh.userData.gx = gx;
    mesh.userData.gy = gy;
    mesh.userData.gz = gz;

    scene.add(mesh);
    dynamicBlocks.set(blockKey(gx, gy, gz), { mesh, blockType, gx, gy, gz });
    solidBlocks.add(blockKey(gx, gy, gz));
}

function removeDynamicBlockByKey(key) {
    const dynamic = dynamicBlocks.get(key);
    if (!dynamic) return false;

    scene.remove(dynamic.mesh);
    dynamicBlocks.delete(key);
    solidBlocks.delete(key);
    return true;
}

function clearDynamicBlocks() {
    for (const dynamic of dynamicBlocks.values()) {
        scene.remove(dynamic.mesh);
    }
    dynamicBlocks.clear();
}

function getDropRestHeight(gx, gz, startY) {
    for (let y = Math.min(MAX_HEIGHT - 1, startY); y >= 0; y--) {
        if (isSolid(gx, y, gz)) {
            return y + 1;
        }
    }

    return Math.max(1, getTerrainHeight(gx, gz));
}

function spawnBlockDrop(gx, gy, gz, blockType) {
    const dropMesh = new THREE.Mesh(sharedDropGeometry, getDropMaterial(blockType));
    dropMesh.castShadow = true;
    dropMesh.receiveShadow = false;

    const dropSize = VOXEL_SIZE * BLOCK_DROP_SCALE;
    const restY = getDropRestHeight(gx, gz, gy - 1);
    const y = restY + dropSize * 0.5 + 0.055;
    dropMesh.position.set(gx + 0.5, y, gz + 0.5);
    dropMesh.rotation.set(0, Math.random() * Math.PI * 2, 0);

    scene.add(dropMesh);
    itemDrops.push({
        mesh: dropMesh,
        blockType,
        baseY: y,
        bobPhase: Math.random() * Math.PI * 2,
        spinY: 1.2 + Math.random() * 1.0
    });
}

function removeDropAt(index) {
    const drop = itemDrops[index];
    if (!drop) return;
    scene.remove(drop.mesh);
    itemDrops.splice(index, 1);
}

function clearItemDrops() {
    for (let i = itemDrops.length - 1; i >= 0; i--) {
        removeDropAt(i);
    }
}

function updateItemDrops(dt) {
    for (const drop of itemDrops) {
        drop.mesh.rotation.y += drop.spinY * dt;
        drop.mesh.position.y = drop.baseY + Math.sin(worldTime * DROP_BOB_SPEED + drop.bobPhase) * DROP_BOB_AMPLITUDE;
    }
}

function spawnBreakParticles(gx, gy, gz, blockType) {
    const positions = new Float32Array(BREAK_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(BREAK_PARTICLE_COUNT * 3);
    const cx = gx + 0.5;
    const cy = gy + 0.5;
    const cz = gz + 0.5;

    for (let i = 0; i < BREAK_PARTICLE_COUNT; i++) {
        const base = i * 3;
        const ox = (Math.random() - 0.5) * 0.35;
        const oy = (Math.random() - 0.5) * 0.35;
        const oz = (Math.random() - 0.5) * 0.35;
        positions[base] = cx + ox;
        positions[base + 1] = cy + oy;
        positions[base + 2] = cz + oz;

        velocities[base] = (Math.random() - 0.5) * 1.8;
        velocities[base + 1] = 0.5 + Math.random() * 1.6;
        velocities[base + 2] = (Math.random() - 0.5) * 1.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: getBreakParticleColor(blockType),
        size: 0.08,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    breakParticles.push({
        points,
        positions,
        velocities,
        life: 0,
        duration: 0.35
    });
}

function clearBreakParticles() {
    for (const particle of breakParticles) {
        scene.remove(particle.points);
        particle.points.geometry.dispose();
        particle.points.material.dispose();
    }
    breakParticles.length = 0;
}

function updateBreakParticles(dt) {
    for (let p = breakParticles.length - 1; p >= 0; p--) {
        const particle = breakParticles[p];
        particle.life += dt;
        const drag = Math.max(0, 1 - dt * 3.0);

        for (let i = 0; i < BREAK_PARTICLE_COUNT; i++) {
            const base = i * 3;
            particle.velocities[base] *= drag;
            particle.velocities[base + 2] *= drag;
            particle.velocities[base + 1] -= 12 * dt;

            particle.positions[base] += particle.velocities[base] * dt;
            particle.positions[base + 1] += particle.velocities[base + 1] * dt;
            particle.positions[base + 2] += particle.velocities[base + 2] * dt;
        }

        const alpha = 1 - (particle.life / particle.duration);
        particle.points.material.opacity = Math.max(0, alpha);
        particle.points.geometry.attributes.position.needsUpdate = true;

        if (particle.life >= particle.duration) {
            scene.remove(particle.points);
            particle.points.geometry.dispose();
            particle.points.material.dispose();
            breakParticles.splice(p, 1);
        }
    }
}

function computeHeightRaw(wx, wz) {
    const x = wx;
    const z = wz;

    // Light domain warp removes repetitive directional artifacts in terrain bands.
    const warpX = noise.noise(x * 0.008 + 410, z * 0.008 + 910) * 5.0;
    const warpZ = noise.noise(x * 0.008 + 770, z * 0.008 + 170) * 5.0;
    const nx = x + warpX;
    const nz = z + warpZ;

    const continent = Math.pow(fbmNoise01(nx * 0.007 + 100, nz * 0.007 + 100, 4, 2.0, 0.5), 1.15);
    const hills = fbmNoise01(nx * 0.028 + 340, nz * 0.028 + 340, 4, 2.05, 0.52);
    const ridged = 1.0 - Math.abs(noise.noise(nx * 0.036 + 680, nz * 0.036 + 680));
    const ridgedShape = ridged * ridged;

    // Biome blend keeps transitions smoother and avoids isolated spike towers.
    const biome = fbmNoise01(nx * 0.004 + 1000, nz * 0.004 + 1000, 3, 2.0, 0.55);
    const plainsWeight = clamp01((0.58 - biome) * 1.8);
    const hillsWeight = clamp01(1.0 - Math.abs(biome - 0.54) * 2.2);
    const mountainWeight = clamp01((biome - 0.52) * 2.4);

    const terrainBase = (SEA_LEVEL - 1.0) + continent * 10.8;
    const terrainHills = (hills - 0.5) * (5.0 + hillsWeight * 7.2 + plainsWeight * 1.0);
    const terrainMountains = ridgedShape * mountainWeight * 13.2;
    const micro = noise.noise(nx * 0.088 + 1410, nz * 0.088 + 1410) * 0.56;

    const heightFloat = terrainBase + terrainHills + terrainMountains + micro;
    return Math.max(2, Math.min(MAX_HEIGHT, Math.round(heightFloat)));
}

function getTerrainHeight(wx, wz) {
    // 5x5 tent filter smooths artifacts while preserving macro terrain shapes.
    const kernel = [1, 2, 3, 2, 1];
    let weightedSum = 0;
    let weightTotal = 0;

    for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -2; oz <= 2; oz++) {
            const w = kernel[ox + 2] * kernel[oz + 2];
            weightedSum += computeHeightRaw(wx + ox, wz + oz) * w;
            weightTotal += w;
        }
    }

    const smooth = weightedSum / weightTotal;
    const center = computeHeightRaw(wx, wz);
    const blended = smooth * 0.56 + center * 0.44;
    return Math.max(2, Math.min(MAX_HEIGHT, Math.round(blended)));
}

function loadChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (loadedChunks.has(key)) return;

    const instances = {
        [BLOCK_GRASS]: [],
        [BLOCK_DIRT]: [],
        [BLOCK_STONE]: []
    };
    const chunkBlockKeys = [];
    const meshes = [];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const wx = cx * CHUNK_SIZE + lx;
            const wz = cz * CHUNK_SIZE + lz;
            const height = getTerrainHeight(wx, wz);
            addColumn(wx, wz, height, instances, chunkBlockKeys);
        }
    }

    for (const blockType of [BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE]) {
        const positions = instances[blockType];
        if (positions.length === 0) continue;

        const mesh = new THREE.InstancedMesh(sharedVoxelGeometry, blockMaterials[blockType], positions.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        mesh.userData.blockType = blockType;

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < positions.length; i++) {
            matrix.setPosition(positions[i]);
            mesh.setMatrixAt(i, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
        meshes.push(mesh);
    }

    loadedChunks.set(key, { cx, cz, meshes, blockKeys: chunkBlockKeys });
}

function unloadChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = loadedChunks.get(key);
    if (!chunk) return;

    for (const mesh of chunk.meshes) {
        scene.remove(mesh);
    }
    for (const bKey of chunk.blockKeys) {
        solidBlocks.delete(bKey);
    }

    loadedChunks.delete(key);
}

function clearLoadedChunks() {
    for (const key of Array.from(loadedChunks.keys())) {
        const [cx, cz] = key.split('|').map(Number);
        unloadChunk(cx, cz);
    }
    solidBlocks.clear();
    hoveredBlock.mesh = null;
    hoveredBlock.instanceId = -1;
    hoveredBlock.isDynamic = false;
    hoveredBlock.distance = Infinity;
    hoverFaceNormal.set(0, 0, 0);
    hoverOutline.visible = false;
    lastChunkX = null;
    lastChunkZ = null;
}

function updateLoadedChunksAroundPlayer(force = false) {
    const pcx = worldToChunk(player.position.x);
    const pcz = worldToChunk(player.position.z);

    if (!force && pcx === lastChunkX && pcz === lastChunkZ) return;

    const targetKeys = new Set();
    for (let dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
        for (let dz = -CHUNK_LOAD_RADIUS; dz <= CHUNK_LOAD_RADIUS; dz++) {
            const cx = pcx + dx;
            const cz = pcz + dz;
            const key = chunkKey(cx, cz);
            targetKeys.add(key);
            if (!loadedChunks.has(key)) {
                loadChunk(cx, cz);
            }
        }
    }

    for (const key of Array.from(loadedChunks.keys())) {
        if (!targetKeys.has(key)) {
            const [cx, cz] = key.split('|').map(Number);
            unloadChunk(cx, cz);
        }
    }

    lastChunkX = pcx;
    lastChunkZ = pcz;
}

function getSurfaceY(x, z) {
    return getTerrainHeight(Math.floor(x), Math.floor(z));
}

function regenerateWorld(seedValue) {
    currentSeed = normalizeSeed(seedValue, currentSeed);
    noise = new PerlinNoise(currentSeed >>> 0);

    removedBlocks.clear();
    clearItemDrops();
    clearBreakParticles();
    clearDynamicBlocks();
    clearLoadedChunks();

    const spawn = chooseSpawnPosition();
    player.position.set(spawn.x, spawn.y, spawn.z);
    player.velocity.set(0, 0, 0);
    player.onGround = true;
    player.canJump = true;
    keys.jumpRequestedAt = -Infinity;

    updateLoadedChunksAroundPlayer(true);
    updateCamera();
    syncSeedUI();
}

function getLocalVarianceScore(wx, wz, radius) {
    let minH = Infinity;
    let maxH = -Infinity;
    let sumDelta = 0;
    let count = 0;

    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            const h = getTerrainHeight(wx + x, wz + z);
            minH = Math.min(minH, h);
            maxH = Math.max(maxH, h);

            const hx = getTerrainHeight(wx + x + 1, wz + z);
            const hz = getTerrainHeight(wx + x, wz + z + 1);
            sumDelta += Math.abs(h - hx) + Math.abs(h - hz);
            count += 2;
        }
    }

    const spread = maxH - minH;
    const roughness = count > 0 ? (sumDelta / count) : 0;
    return spread * 0.8 + roughness * 4.0;
}

function chooseSpawnPosition() {
    let best = { x: 0, z: 0, score: -Infinity };
    const targetVariance = 11.0;
    for (let x = -48; x <= 48; x += 4) {
        for (let z = -48; z <= 48; z += 4) {
            const variance = getLocalVarianceScore(x, z, 5);
            const distancePenalty = Math.hypot(x, z) * 0.012;
            const score = -Math.abs(variance - targetVariance) - distancePenalty;
            if (score > best.score) {
                best = { x, z, score };
            }
        }
    }

    return {
        x: best.x + 0.5,
        z: best.z + 0.5,
        y: getSurfaceY(best.x, best.z)
    };
}

const spawnPosition = chooseSpawnPosition();

// Player controller and hitbox
const player = {
    position: new THREE.Vector3(spawnPosition.x, spawnPosition.y, spawnPosition.z), // feet position
    velocity: new THREE.Vector3(0, 0, 0),
    radius: 0.3,
    height: 1.8,
    eyeHeight: 1.62,
    yaw: 0,
    pitch: 0,
    isSprinting: false,
    onGround: false,
    canJump: true,
    lastJumpAt: -Infinity
};

const MOVE_SPEED = 3.0; // blocks per second
const SPRINT_SPEED_MULTIPLIER = 1.3;
const AIR_CONTROL = 0.18;
const GRAVITY = 22.0;
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 1.18); // calibrated for an effective ~1.1-block jump
const JUMP_COOLDOWN_MS = 50;
const JUMP_BUFFER_MS = 120;

const keys = {
    z: false,
    q: false,
    s: false,
    d: false,
    w: false,
    a: false,
    shift: false,
    jumpRequestedAt: -Infinity
};

const pauseMenuEl = document.getElementById('pauseMenu');
const seedLabelEl = document.getElementById('seedLabel');
const seedInputEl = document.getElementById('seedInput');
const applySeedBtn = document.getElementById('applySeedBtn');
const randomSeedBtn = document.getElementById('randomSeedBtn');
const resumeBtn = document.getElementById('resumeBtn');
const hotbarSlots = Array.from(document.querySelectorAll('.hotbar-slot'));
const crosshairEl = document.getElementById('crosshair');
const hotbarDom = [];

let isPaused = false;
let selectedHotbarSlot = 0;

function setupHotbarDom() {
    for (let i = 0; i < hotbarSlots.length; i++) {
        const slot = hotbarSlots[i];
        const indexEl = slot.querySelector('span');
        if (indexEl) indexEl.className = 'hotbar-index';

        const itemEl = document.createElement('div');
        itemEl.className = 'hotbar-item type-empty';
        slot.appendChild(itemEl);

        const countEl = document.createElement('div');
        countEl.className = 'hotbar-count';
        slot.appendChild(countEl);

        hotbarDom.push({ slot, itemEl, countEl });
    }
}

function updateHotbarUI() {
    for (let i = 0; i < hotbarInventory.length; i++) {
        const slotInv = hotbarInventory[i];
        const slotDom = hotbarDom[i];
        if (!slotDom) continue;

        const blockTypeName = getBlockTypeName(slotInv.type);
        slotDom.itemEl.className = `hotbar-item type-${blockTypeName}`;
        slotDom.countEl.textContent = slotInv.count > 1 ? String(slotInv.count) : '';
    }
}

function addToHotbar(blockType, amount = 1) {
    let remaining = amount;

    for (let i = 0; i < hotbarInventory.length; i++) {
        const slot = hotbarInventory[i];
        if (slot.type !== blockType) continue;
        if (slot.count >= HOTBAR_STACK_MAX) continue;

        const canAdd = Math.min(HOTBAR_STACK_MAX - slot.count, remaining);
        slot.count += canAdd;
        remaining -= canAdd;
        if (remaining <= 0) {
            updateHotbarUI();
            return true;
        }
    }

    for (let i = 0; i < hotbarInventory.length; i++) {
        const slot = hotbarInventory[i];
        if (slot.count > 0) continue;

        const canAdd = Math.min(HOTBAR_STACK_MAX, remaining);
        slot.type = blockType;
        slot.count = canAdd;
        remaining -= canAdd;
        if (remaining <= 0) {
            updateHotbarUI();
            return true;
        }
    }

    updateHotbarUI();
    return remaining < amount;
}

function consumeSelectedHotbarBlock() {
    const slot = hotbarInventory[selectedHotbarSlot];
    if (!slot || slot.count <= 0 || slot.type === 0) return false;

    slot.count -= 1;
    if (slot.count <= 0) {
        slot.count = 0;
        slot.type = 0;
    }

    updateHotbarUI();
    return true;
}

function setSelectedHotbarSlot(index) {
    if (hotbarSlots.length === 0) return;
    selectedHotbarSlot = Math.max(0, Math.min(hotbarSlots.length - 1, index));
    for (let i = 0; i < hotbarSlots.length; i++) {
        hotbarSlots[i].classList.toggle('selected', i === selectedHotbarSlot);
    }
}

function clearMovementKeys() {
    keys.z = false;
    keys.q = false;
    keys.s = false;
    keys.d = false;
    keys.w = false;
    keys.a = false;
    keys.shift = false;
    keys.jumpRequestedAt = -Infinity;
    player.isSprinting = false;
}

function syncSeedUI() {
    if (seedLabelEl) seedLabelEl.textContent = `Seed: ${currentSeed}`;
    if (seedInputEl) seedInputEl.value = String(currentSeed);
}

function setPaused(paused) {
    isPaused = paused;
    if (pauseMenuEl) {
        pauseMenuEl.classList.toggle('hidden', !paused);
        pauseMenuEl.setAttribute('aria-hidden', String(!paused));
    }
    if (crosshairEl) {
        crosshairEl.classList.toggle('hidden', paused);
    }
    hoverOutline.visible = false;

    if (paused) {
        clearMovementKeys();
        if (document.pointerLockElement === document.body) {
            document.exitPointerLock();
        }
    }
}

function breakTargetedBlock() {
    if (!hoveredBlock.mesh) return;

    const gx = hoveredBlock.gx;
    const gy = hoveredBlock.gy;
    const gz = hoveredBlock.gz;
    const key = blockKey(gx, gy, gz);
    if (!solidBlocks.has(key)) return;

    if (hoveredBlock.isDynamic) {
        removeDynamicBlockByKey(key);
    } else {
        if (hoveredBlock.instanceId < 0) return;
        hoveredBlock.mesh.setMatrixAt(hoveredBlock.instanceId, hiddenInstanceMatrix);
        hoveredBlock.mesh.instanceMatrix.needsUpdate = true;
        solidBlocks.delete(key);
    }

    removedBlocks.add(key);
    spawnBreakParticles(gx, gy, gz, hoveredBlock.blockType);
    spawnBlockDrop(gx, gy, gz, hoveredBlock.blockType);

    hoveredBlock.mesh = null;
    hoveredBlock.instanceId = -1;
    hoveredBlock.isDynamic = false;
    hoveredBlock.distance = Infinity;
    hoverFaceNormal.set(0, 0, 0);
    hoverOutline.visible = false;
}

function tryPlaceSelectedBlock() {
    if (!hoveredBlock.mesh) return;
    if (hoveredBlock.distance > BLOCK_INTERACT_RANGE) return;
    if (hoverFaceNormal.x === 0 && hoverFaceNormal.y === 0 && hoverFaceNormal.z === 0) return;

    const slot = hotbarInventory[selectedHotbarSlot];
    if (!slot || slot.count <= 0 || slot.type === 0) return;

    const px = hoveredBlock.gx + hoverFaceNormal.x;
    const py = hoveredBlock.gy + hoverFaceNormal.y;
    const pz = hoveredBlock.gz + hoverFaceNormal.z;
    const placeKey = blockKey(px, py, pz);

    if (solidBlocks.has(placeKey)) return;
    if (py < 0 || py > MAX_HEIGHT + 32) return;

    // Do not allow placing inside player's collision body.
    const playerAabb = getPlayerAABB(player.position);
    if (intersectsBlock(playerAabb, px, py, pz)) return;

    createDynamicBlock(px, py, pz, slot.type);
    removedBlocks.delete(placeKey);
    consumeSelectedHotbarBlock();
}

function updateDropPickup() {
    const playerAabb = getPlayerAABB(player.position);
    const pickupRangeSq = DROP_PICKUP_RANGE * DROP_PICKUP_RANGE;

    for (let i = itemDrops.length - 1; i >= 0; i--) {
        const drop = itemDrops[i];
        pickupClosestPoint.set(
            Math.max(playerAabb.minX, Math.min(playerAabb.maxX, drop.mesh.position.x)),
            Math.max(playerAabb.minY, Math.min(playerAabb.maxY, drop.mesh.position.y)),
            Math.max(playerAabb.minZ, Math.min(playerAabb.maxZ, drop.mesh.position.z))
        );

        if (pickupClosestPoint.distanceToSquared(drop.mesh.position) > pickupRangeSq) continue;

        const picked = addToHotbar(drop.blockType, 1);
        if (picked) {
            removeDropAt(i);
        }
    }
}

function updateBlockHoverOutline() {
    if (isPaused) {
        hoverOutline.visible = false;
        return;
    }

    chunkRaycastMeshes.length = 0;
    for (const chunk of loadedChunks.values()) {
        for (const mesh of chunk.meshes) {
            chunkRaycastMeshes.push(mesh);
        }
    }
    for (const dynamic of dynamicBlocks.values()) {
        chunkRaycastMeshes.push(dynamic.mesh);
    }

    if (chunkRaycastMeshes.length === 0) {
        hoverOutline.visible = false;
        return;
    }

    hoverRaycaster.setFromCamera(hoverRayNdc, camera);
    const intersections = hoverRaycaster.intersectObjects(chunkRaycastMeshes, false);
    const hit = intersections.length > 0 ? intersections[0] : null;

    if (!hit || hit.distance > BLOCK_INTERACT_RANGE) {
        hoveredBlock.mesh = null;
        hoveredBlock.instanceId = -1;
        hoveredBlock.isDynamic = false;
        hoveredBlock.distance = Infinity;
        hoverFaceNormal.set(0, 0, 0);
        hoverOutline.visible = false;
        return;
    }

    if (hit.face) {
        hoverNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
        hoverFaceNormal.copy(hit.face.normal).applyMatrix3(hoverNormalMatrix).normalize();
        hoverFaceNormal.set(Math.round(hoverFaceNormal.x), Math.round(hoverFaceNormal.y), Math.round(hoverFaceNormal.z));
    } else {
        hoverFaceNormal.set(0, 0, 0);
    }

    if (hit.object && hit.object.isInstancedMesh && hit.instanceId !== undefined) {
        hit.object.getMatrixAt(hit.instanceId, hoverInstanceMatrix);
        hoverWorldPosition.setFromMatrixPosition(hoverInstanceMatrix);
        hit.object.localToWorld(hoverWorldPosition);
        hoverOutline.position.copy(hoverWorldPosition);

        hoveredBlock.mesh = hit.object;
        hoveredBlock.instanceId = hit.instanceId;
        hoveredBlock.gx = Math.floor(hoverWorldPosition.x);
        hoveredBlock.gy = Math.floor(hoverWorldPosition.y);
        hoveredBlock.gz = Math.floor(hoverWorldPosition.z);
        hoveredBlock.blockType = hit.object.userData.blockType || BLOCK_DIRT;
        hoveredBlock.isDynamic = false;
        hoveredBlock.distance = hit.distance;

        hoverOutline.visible = true;
        return;
    }

    if (hit.object && hit.object.userData && hit.object.userData.isDynamicBlock) {
        hoverWorldPosition.copy(hit.object.position);
        hoverOutline.position.copy(hoverWorldPosition);

        hoveredBlock.mesh = hit.object;
        hoveredBlock.instanceId = -1;
        hoveredBlock.gx = hit.object.userData.gx;
        hoveredBlock.gy = hit.object.userData.gy;
        hoveredBlock.gz = hit.object.userData.gz;
        hoveredBlock.blockType = hit.object.userData.blockType || BLOCK_DIRT;
        hoveredBlock.isDynamic = true;
        hoveredBlock.distance = hit.distance;

        hoverOutline.visible = true;
        return;
    }

    hoveredBlock.mesh = null;
    hoveredBlock.instanceId = -1;
    hoveredBlock.isDynamic = false;
    hoveredBlock.distance = Infinity;
    hoverFaceNormal.set(0, 0, 0);
    hoverOutline.visible = false;
}

function applySeedFromMenu() {
    const seed = normalizeSeed(seedInputEl ? seedInputEl.value : currentSeed, currentSeed);
    regenerateWorld(seed);
}

function randomizeSeedFromMenu() {
    regenerateWorld(makeRandomSeed());
}

if (applySeedBtn) applySeedBtn.addEventListener('click', applySeedFromMenu);
if (randomSeedBtn) randomSeedBtn.addEventListener('click', randomizeSeedFromMenu);
if (resumeBtn) {
    resumeBtn.addEventListener('click', async () => {
        setPaused(false);
        try {
            await document.body.requestPointerLock();
        } catch (_) {
            // Ignore requestPointerLock rejection in restricted contexts.
        }
    });
}

function getPlayerAABB(pos) {
    return {
        minX: pos.x - player.radius,
        maxX: pos.x + player.radius,
        minY: pos.y,
        maxY: pos.y + player.height,
        minZ: pos.z - player.radius,
        maxZ: pos.z + player.radius
    };
}

function intersectsBlock(aabb, bx, by, bz) {
    return !(
        aabb.maxX <= bx ||
        aabb.minX >= bx + 1 ||
        aabb.maxY <= by ||
        aabb.minY >= by + 1 ||
        aabb.maxZ <= bz ||
        aabb.minZ >= bz + 1
    );
}

function resolveAxis(pos, axis, delta) {
    if (delta === 0) return false;

    let collided = false;

    let aabb = getPlayerAABB(pos);
    const minX = Math.floor(aabb.minX);
    const maxX = Math.floor(aabb.maxX - 1e-6);
    const minY = Math.floor(aabb.minY);
    const maxY = Math.floor(aabb.maxY - 1e-6);
    const minZ = Math.floor(aabb.minZ);
    const maxZ = Math.floor(aabb.maxZ - 1e-6);

    for (let bx = minX; bx <= maxX; bx++) {
        for (let by = minY; by <= maxY; by++) {
            for (let bz = minZ; bz <= maxZ; bz++) {
                if (!isSolid(bx, by, bz)) continue;
                if (!intersectsBlock(aabb, bx, by, bz)) continue;

                if (axis === 'x') {
                    if (delta > 0) pos.x = bx - player.radius;
                    else pos.x = bx + 1 + player.radius;
                    player.velocity.x = 0;
                    collided = true;
                } else if (axis === 'y') {
                    if (delta > 0) pos.y = by - player.height;
                    else {
                        pos.y = by + 1;
                        player.onGround = true;
                        player.canJump = true;
                    }
                    player.velocity.y = 0;
                    collided = true;
                } else {
                    if (delta > 0) pos.z = bz - player.radius;
                    else pos.z = bz + 1 + player.radius;
                    player.velocity.z = 0;
                    collided = true;
                }

                aabb = getPlayerAABB(pos);
            }
        }
    }

    return collided;
}

function moveWithCollisions(dt) {
    player.onGround = false;

    const dx = player.velocity.x * dt;
    const dy = player.velocity.y * dt;
    const dz = player.velocity.z * dt;

    player.position.y += dy;
    resolveAxis(player.position, 'y', dy);

    if (dx !== 0) {
        player.position.x += dx;
        resolveAxis(player.position, 'x', dx);
    }

    if (dz !== 0) {
        player.position.z += dz;
        resolveAxis(player.position, 'z', dz);
    }
}

// Input handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        e.preventDefault();
        setPaused(!isPaused);
        return;
    }

    if (isPaused) return;

    if (e.code.startsWith('Digit')) {
        const slot = Number.parseInt(e.code.slice(5), 10);
        if (slot >= 1 && slot <= 9) {
            setSelectedHotbarSlot(slot - 1);
        }
    }

    if (e.code.startsWith('Numpad')) {
        const slot = Number.parseInt(e.code.slice(6), 10);
        if (slot >= 1 && slot <= 9) {
            setSelectedHotbarSlot(slot - 1);
        }
    }

    const key = e.key.toLowerCase();
    const isSpace = e.code === 'Space' || key === ' ' || key === 'spacebar';

    if (key === 'z') keys.z = true;
    if (key === 'q') keys.q = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true;

    if (isSpace) {
        if (!e.repeat) keys.jumpRequestedAt = performance.now();
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (isPaused) return;

    const key = e.key.toLowerCase();
    if (key === 'z') keys.z = false;
    if (key === 'q') keys.q = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
});

// Pointer lock and camera control
let isPointerLocked = false;

window.addEventListener('wheel', (e) => {
    if (isPaused) return;
    if (hotbarSlots.length === 0) return;

    if (e.deltaY > 0) {
        setSelectedHotbarSlot((selectedHotbarSlot + 1) % hotbarSlots.length);
    } else if (e.deltaY < 0) {
        setSelectedHotbarSlot((selectedHotbarSlot - 1 + hotbarSlots.length) % hotbarSlots.length);
    }
});

document.addEventListener('click', async () => {
    if (isPaused || isPointerLocked) return;

    try {
        await document.body.requestPointerLock();
    } catch (_) {
        // Ignore requestPointerLock rejection in restricted contexts.
    }
});

document.addEventListener('contextmenu', (e) => {
    if (isPointerLocked) {
        e.preventDefault();
    }
});

document.addEventListener('mousedown', async (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    if (isPaused) return;

    if (!isPointerLocked) {
        try {
            await document.body.requestPointerLock();
        } catch (_) {
            // Ignore requestPointerLock rejection in restricted contexts.
        }
        return;
    }

    e.preventDefault();
    if (e.button === 0) {
        breakTargetedBlock();
    } else if (e.button === 2) {
        tryPlaceSelectedBlock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === document.body;
});

document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;

    const sensitivity = 0.0021;
    player.yaw -= e.movementX * sensitivity;
    player.pitch -= e.movementY * sensitivity;
    player.pitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, player.pitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
});

function updateMovement(dt) {
    const inputX = (keys.d ? 1 : 0) - ((keys.q || keys.a) ? 1 : 0);
    const inputZ = (keys.s ? 1 : 0) - (keys.z || keys.w ? 1 : 0);

    const wish = new THREE.Vector3(inputX, 0, inputZ);
    const isMoving = wish.lengthSq() > 0;
    if (isMoving) {
        wish.normalize();
        wish.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
    }

    player.isSprinting = keys.shift && isMoving;
    const speed = MOVE_SPEED * (player.isSprinting ? SPRINT_SPEED_MULTIPLIER : 1.0);
    const targetVX = wish.x * speed;
    const targetVZ = wish.z * speed;

    if (player.onGround) {
        player.velocity.x = targetVX;
        player.velocity.z = targetVZ;
    } else {
        player.velocity.x += (targetVX - player.velocity.x) * AIR_CONTROL;
        player.velocity.z += (targetVZ - player.velocity.z) * AIR_CONTROL;
    }

    const now = performance.now();
    const wantsJump = (now - keys.jumpRequestedAt) <= JUMP_BUFFER_MS;
    if (wantsJump && player.onGround && player.canJump && (now - player.lastJumpAt) >= JUMP_COOLDOWN_MS) {
        player.velocity.y = JUMP_SPEED;
        player.onGround = false;
        player.canJump = false;
        player.lastJumpAt = now;
        keys.jumpRequestedAt = -Infinity;
    }
}

function updateSprintFov(dt) {
    const targetFov = player.isSprinting ? SPRINT_FOV : BASE_FOV;
    const lerpFactor = Math.min(1, dt * 10);
    camera.fov += (targetFov - camera.fov) * lerpFactor;
    camera.updateProjectionMatrix();
}

function updatePhysics(dt) {
    if (!player.onGround) {
        player.velocity.y -= GRAVITY * dt;
    }

    moveWithCollisions(dt);

    if (player.position.y < -10) {
        const y = getSurfaceY(player.position.x, player.position.z);
        player.position.set(player.position.x, y + 0.1, player.position.z);
        player.velocity.set(0, 0, 0);
        player.onGround = true;
        player.canJump = true;
    }
}

function updateCamera() {
    camera.position.set(
        player.position.x,
        player.position.y + player.eyeHeight,
        player.position.z
    );
}

let lastTime = performance.now();
function animate(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    worldTime += dt;

    if (!isPaused) {
        updateLoadedChunksAroundPlayer();
        updateMovement(dt);
        updatePhysics(dt);
        updateLoadedChunksAroundPlayer();
        updateCamera();
        updateSprintFov(dt);
        updateItemDrops(dt);
        updateDropPickup();
        updateBreakParticles(dt);
    }

    updateBlockHoverOutline();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

setupHotbarDom();
updateHotbarUI();
syncSeedUI();
setSelectedHotbarSlot(0);
regenerateWorld(currentSeed);
requestAnimationFrame(animate);
