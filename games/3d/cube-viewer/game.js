// 3D Cube Viewer with Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1a1a2e);
document.body.appendChild(renderer.domElement);

// Create cube
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshPhongMaterial({ 
    color: 0x667eea,
    wireframe: false,
    shininess: 100
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Create edges for better visibility
const edges = new THREE.EdgesGeometry(geometry);
const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
cube.add(line);

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

camera.position.z = 4;

// Mouse controls
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Zoom controls
let zoom = 4;
document.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom += e.deltaY * 0.01;
    zoom = Math.max(1, Math.min(20, zoom));
    camera.position.z = zoom;
}, { passive: false });

// Color changing
const colors = [0x667eea, 0xf093fb, 0x4facfe, 0xff6b6b, 0x00d084, 0xffd93d];
let colorIndex = 0;

document.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % colors.length;
    material.color.setHex(colors[colorIndex]);
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Rotate based on mouse position
    cube.rotation.x = mouseY * 2;
    cube.rotation.y = mouseX * 2;

    renderer.render(scene, camera);
}

animate();
