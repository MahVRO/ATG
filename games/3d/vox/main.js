// VOX Main Game Engine - Three.js rendering and game loop

let scene, camera, renderer, world, player;
let chunkMeshes = {};
let lastPlayerChunk = { x: 0, z: 0 };

function init() {
    // Three.js setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 200, 250);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(100, 100, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // World and Player
    world = new World();
    player = new Player(world, 'creative');

    // Load initial chunks
    updateChunks();

    // Input
    setupInputHandlers(player, world, camera);

    // UI
    initializeUI();

    // Show gamemode selector
    document.getElementById('gamemodePanel').style.display = 'flex';

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start game loop
    animate();
}

function createChunkMesh(chunk) {
    const group = new THREE.Group();
    const chunkWorldX = chunk.x * CHUNK_SIZE;
    const chunkWorldZ = chunk.z * CHUNK_SIZE;

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const blockType = chunk.getBlock(lx, y, lz);
                
                if (blockType === BLOCK_TYPES.AIR) continue;

                const x = chunkWorldX + lx;
                const z = chunkWorldZ + lz;

                // Check if any face is exposed
                let hasExposedFace = false;
                const faceDirections = [
                    { dx: 0, dy: 1, dz: 0 },
                    { dx: 0, dy: -1, dz: 0 },
                    { dx: 1, dy: 0, dz: 0 },
                    { dx: -1, dy: 0, dz: 0 },
                    { dx: 0, dy: 0, dz: 1 },
                    { dx: 0, dy: 0, dz: -1 }
                ];

                for (let dir of faceDirections) {
                    const adjacent = world.getBlock(x + dir.dx, y + dir.dy, z + dir.dz);
                    if (adjacent === BLOCK_TYPES.AIR) {
                        hasExposedFace = true;
                        break;
                    }
                }

                if (hasExposedFace) {
                    // Create a cube for this block
                    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
                    const color = getBlockColor(blockType);
                    const material = new THREE.MeshLambertMaterial({ 
                        color,
                        flatShading: true 
                    });
                    const cube = new THREE.Mesh(boxGeo, material);
                    
                    cube.position.set(x + 0.5, y + 0.5, z + 0.5);
                    cube.castShadow = true;
                    cube.receiveShadow = true;
                    group.add(cube);
                }
            }
        }
    }

    return group.children.length > 0 ? group : null;
}

function updateChunks() {
    const playerChunkX = Math.floor(player.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(player.position.z / CHUNK_SIZE);

    // Load chunks around player
    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
        for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
            const key = `${x},${z}`;
            
            if (!chunkMeshes[key]) {
                const chunk = world.getChunk(x, z, true);
                const mesh = createChunkMesh(chunk);
                if (mesh) {
                    chunkMeshes[key] = mesh;
                    scene.add(mesh);
                }
            }
        }
    }

    // Remove far chunks
    for (const key in chunkMeshes) {
        const [x, z] = key.split(',').map(Number);
        if (Math.abs(x - playerChunkX) > RENDER_DISTANCE + 1 || 
            Math.abs(z - playerChunkZ) > RENDER_DISTANCE + 1) {
            scene.remove(chunkMeshes[key]);
            delete chunkMeshes[key];
        }
    }

    lastPlayerChunk = { x: playerChunkX, z: playerChunkZ };
}

function animate() {
    requestAnimationFrame(animate);

    if (!isPaused && gameStarted) {
        // Update player
        player.update();

        // Handle breaking
        if (player.breaking) {
            const targetBlock = player.getTargetBlock();
            if (targetBlock) {
                player.breakBlock(targetBlock);
            }
        }

        // Update chunks
        updateChunks();

        // Update camera position
        camera.position.copy(player.position);
        camera.position.y += 1.6;

        // Update HUD
        updatePlayerInfo(player);
    }

    // Render
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the game
window.addEventListener('load', init);
