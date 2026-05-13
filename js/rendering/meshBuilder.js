/**
 * Chunk Mesh Builder
 * Converts chunk data to Three.js geometry
 */

class ChunkMeshBuilder {
    constructor(renderer) {
        this.renderer = renderer;
        this.textureCanvas = this.createDefaultTexture();
    }

    createDefaultTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Create a simple checkerboard texture
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 16; j++) {
                const blockSize = 16;
                const x = i * blockSize;
                const y = j * blockSize;
                
                const hue = (i + j) % 2 === 0 ? 200 : 180;
                ctx.fillStyle = `hsl(${hue}, 50%, 50%)`;
                ctx.fillRect(x, y, blockSize, blockSize);
                
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.strokeRect(x, y, blockSize, blockSize);
            }
        }

        return new THREE.CanvasTexture(canvas);
    }

    buildChunkMesh(chunk, chunkManager) {
        const positions = [];
        const colors = [];
        const indices = [];
        let indexCount = 0;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const blockId = chunk.getBlock(lx, y, lz);

                    if (blockId === 0) continue; // Skip air

                    const block = BLOCK_REGISTRY.getBlock(blockId);
                    const color = block ? block.color : 0xffffff;

                    // Check each face
                    this.addFaceIfExposed(chunk, chunkManager, lx, y, lz, 0, 1, 0, positions, colors, indices, indexCount, color); // Top
                    this.addFaceIfExposed(chunk, chunkManager, lx, y, lz, 0, -1, 0, positions, colors, indices, indexCount, color); // Bottom
                    this.addFaceIfExposed(chunk, chunkManager, lx, y, lz, 1, 0, 0, positions, colors, indices, indexCount, color); // Right
                    this.addFaceIfExposed(chunk, chunkManager, lx, y, lz, -1, 0, 0, positions, colors, indices, indexCount, color); // Left
                    this.addFaceIfExposed(chunk, chunkManager, lx, y, lz, 0, 0, 1, positions, colors, indices, indexCount, color); // Front
                    this.addFaceIfExposed(chunk, chunkManager, lx, y, lz, 0, 0, -1, positions, colors, indices, indexCount, color); // Back

                    indexCount = indices.length / 3;
                }
            }
        }

        if (positions.length === 0) {
            return null;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(colors), 3, true));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE);

        return mesh;
    }

    addFaceIfExposed(chunk, chunkManager, lx, y, lz, dx, dy, dz, positions, colors, indices, indexCount, color) {
        const wx = chunk.getWorldX(lx);
        const wy = y;
        const wz = chunk.getWorldZ(lz);
        
        const adjBlockId = chunkManager.getBlock(wx + dx, wy + dy, wz + dz);

        if (adjBlockId === 0 || BLOCK_REGISTRY.isTransparent(adjBlockId)) {
            this.addFace(lx, y, lz, dx, dy, dz, positions, colors, indices, indexCount, color);
        }
    }

    addFace(lx, y, lz, dx, dy, dz, positions, colors, indices, indexCount, color) {
        const x = lx + 0.5;
        const z = lz + 0.5;
        const fy = y + 0.5;

        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;

        let verts = [];

        if (dx !== 0) {
            const fx = lx + (dx > 0 ? 1 : 0);
            verts = [
                [fx, fy - 0.5, z - 0.5],
                [fx, fy + 0.5, z - 0.5],
                [fx, fy + 0.5, z + 0.5],
                [fx, fy - 0.5, z + 0.5]
            ];
        } else if (dy !== 0) {
            const oy = y + (dy > 0 ? 1 : 0);
            verts = [
                [x - 0.5, oy, z - 0.5],
                [x + 0.5, oy, z - 0.5],
                [x + 0.5, oy, z + 0.5],
                [x - 0.5, oy, z + 0.5]
            ];
        } else if (dz !== 0) {
            const fz = lz + (dz > 0 ? 1 : 0);
            verts = [
                [x - 0.5, fy - 0.5, fz],
                [x + 0.5, fy - 0.5, fz],
                [x + 0.5, fy + 0.5, fz],
                [x - 0.5, fy + 0.5, fz]
            ];
        }

        const start = positions.length / 3;

        for (const v of verts) {
            positions.push(...v);
            colors.push(r, g, b);
        }

        indices.push(
            start, start + 1, start + 2,
            start, start + 2, start + 3
        );
    }
}
