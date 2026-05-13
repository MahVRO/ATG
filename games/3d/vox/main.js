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
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const normals = [];

    const chunkWorldX = chunk.x * CHUNK_SIZE;
    const chunkWorldZ = chunk.z * CHUNK_SIZE;

    // Generate vertices for all blocks in chunk
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const blockType = chunk.getBlock(lx, y, lz);
                
                if (blockType === BLOCK_TYPES.AIR) continue;

                const x = chunkWorldX + lx;
                const z = chunkWorldZ + lz;

                // Check each face
                const faceDirections = [
                    { dx: 0, dy: 1, dz: 0 }, // top
                    { dx: 0, dy: -1, dz: 0 }, // bottom
                    { dx: 1, dy: 0, dz: 0 }, // right
                    { dx: -1, dy: 0, dz: 0 }, // left
                    { dx: 0, dy: 0, dz: 1 }, // front
                    { dx: 0, dy: 0, dz: -1 } // back
                ];

                faceDirections.forEach((dir, faceIdx) => {
                    const adjacentBlock = world.getBlock(x + dir.dx, y + dir.dy, z + dir.dz);
                    
                    if (adjacentBlock === BLOCK_TYPES.AIR) {
                        // Add face vertices
                        const vertices = getBlockFaceVertices(x, y, z, faceIdx);
                        const color = getBlockColor(blockType);

                        vertices.forEach(v => {
                            positions.push(v.x, v.y, v.z);
                            colors.push(
                                ((color >> 16) & 255) / 255,
                                ((color >> 8) & 255) / 255,
                                (color & 255) / 255
                            );
                            normals.push(dir.dx, dir.dy, dir.dz);
                        });
                    }
                });
            }
        }
    }

    if (positions.length === 0) {
        return null;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));

    const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function getBlockFaceVertices(x, y, z, faceIdx) {
    const vertices = [
        // Top face
        [
            { x, y: y + 1, z },
            { x: x + 1, y: y + 1, z },
            { x: x + 1, y: y + 1, z: z + 1 },
            { x, y: y + 1, z: z + 1 }
        ],
        // Bottom face
        [
            { x, y, z: z + 1 },
            { x: x + 1, y, z: z + 1 },
            { x: x + 1, y, z },
            { x, y, z }
        ],
        // Right face
        [
            { x: x + 1, y, z },
            { x: x + 1, y: y + 1, z },
            { x: x + 1, y: y + 1, z: z + 1 },
            { x: x + 1, y, z: z + 1 }
        ],
        // Left face
        [
            { x, y, z: z + 1 },
            { x, y: y + 1, z: z + 1 },
            { x, y: y + 1, z },
            { x, y, z }
        ],
        // Front face
        [
            { x, y, z: z + 1 },
            { x, y: y + 1, z: z + 1 },
            { x: x + 1, y: y + 1, z: z + 1 },
            { x: x + 1, y, z: z + 1 }
        ],
        // Back face
        [
            { x: x + 1, y, z },
            { x: x + 1, y: y + 1, z },
            { x, y: y + 1, z },
            { x, y, z }
        ]
    ];

    return vertices[faceIdx];
}

function updateChunks() {
    const playerChunkX = Math.floor(player.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(player.position.z / CHUNK_SIZE);

    if (playerChunkX !== lastPlayerChunk.x || playerChunkZ !== lastPlayerChunk.z) {
        // Player moved to a new chunk
        lastPlayerChunk = { x: playerChunkX, z: playerChunkZ };

        // Update meshes
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
    }

    // Update dirty chunks
    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
        for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
            const chunk = world.getChunk(x, z, false);
            if (chunk && chunk.dirty) {
                const key = `${x},${z}`;
                if (chunkMeshes[key]) {
                    scene.remove(chunkMeshes[key]);
                }
                const mesh = createChunkMesh(chunk);
                if (mesh) {
                    chunkMeshes[key] = mesh;
                    scene.add(mesh);
                }
                chunk.dirty = false;
            }
        }
    }
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
