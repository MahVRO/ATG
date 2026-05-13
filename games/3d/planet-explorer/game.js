// Planet Explorer - Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// Create planet
const planetGeometry = new THREE.SphereGeometry(50, 64, 64);
const planetMaterial = new THREE.MeshPhongMaterial({
    color: 0x4facfe,
    shininess: 50
});
const planet = new THREE.Mesh(planetGeometry, planetMaterial);
scene.add(planet);

// Add clouds
const cloudGeometry = new THREE.SphereGeometry(51, 32, 32);
const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    wireframe: false
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
scene.add(clouds);

// Add stars
const starsGeometry = new THREE.BufferGeometry();
const starCount = 500;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 4000;
    starPositions[i + 1] = (Math.random() - 0.5) * 4000;
    starPositions[i + 2] = (Math.random() - 0.5) * 4000;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 10
});
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(100, 100, 50);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Camera position
camera.position.z = 150;

// Player movement
const keys = {};
const playerVelocity = new THREE.Vector3();
const playerSpeed = 2;

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse look
let yaw = 0;
let pitch = 0;

document.addEventListener('mousemove', (e) => {
    yaw -= e.movementX * 0.005;
    pitch -= e.movementY * 0.005;

    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    const direction = new THREE.Vector3();
    direction.x = Math.sin(yaw) * Math.cos(pitch);
    direction.y = Math.sin(pitch);
    direction.z = Math.cos(yaw) * Math.cos(pitch);

    camera.lookAt(camera.position.clone().add(direction));
});

// Lock pointer on click
document.addEventListener('click', () => {
    document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
    document.body.requestPointerLock();
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

    // Handle movement
    const moveDirection = new THREE.Vector3();

    if (keys['w']) {
        moveDirection.x += Math.sin(yaw) * playerSpeed;
        moveDirection.z += Math.cos(yaw) * playerSpeed;
    }
    if (keys['s']) {
        moveDirection.x -= Math.sin(yaw) * playerSpeed;
        moveDirection.z -= Math.cos(yaw) * playerSpeed;
    }
    if (keys['a']) {
        moveDirection.x += Math.sin(yaw - Math.PI / 2) * playerSpeed;
        moveDirection.z += Math.cos(yaw - Math.PI / 2) * playerSpeed;
    }
    if (keys['d']) {
        moveDirection.x += Math.sin(yaw + Math.PI / 2) * playerSpeed;
        moveDirection.z += Math.cos(yaw + Math.PI / 2) * playerSpeed;
    }
    if (keys[' ']) {
        moveDirection.y += playerSpeed;
    }
    if (keys['control']) {
        moveDirection.y -= playerSpeed;
    }

    camera.position.add(moveDirection);

    // Rotate clouds
    clouds.rotation.y += 0.0001;

    // Rotate planet
    planet.rotation.y += 0.0001;

    // Rotate stars
    stars.rotation.y += 0.00005;

    renderer.render(scene, camera);
}

animate();
