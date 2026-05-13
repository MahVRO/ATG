/**
 * First-Person Camera Controller
 */

class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.vector = new THREE.Vector3();

        this.isLocked = false;
        this.pointerSpeed = 0.002;

        this.setupControls();
    }

    setupControls() {
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange(), false);
        document.addEventListener('pointerlockerror', () => this.onPointerLockError(), false);

        document.addEventListener('click', () => this.requestPointerLock());
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    requestPointerLock() {
        document.body.requestPointerLock();
    }

    onPointerLockChange() {
        if (document.pointerLockElement === document.body) {
            this.isLocked = true;
        } else {
            this.isLocked = false;
        }
    }

    onPointerLockError() {
        console.error('Pointer lock error');
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= event.movementX * this.pointerSpeed;
        this.euler.x -= event.movementY * this.pointerSpeed;

        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

        this.camera.quaternion.setFromEuler(this.euler);
    }

    getDirection() {
        this.camera.getWorldDirection(this.vector);
        return this.vector.clone();
    }

    getForwardVector() {
        this.vector.set(0, 0, -1);
        this.vector.applyQuaternion(this.camera.quaternion);
        return this.vector.clone();
    }

    getRightVector() {
        this.vector.set(1, 0, 0);
        this.vector.applyQuaternion(this.camera.quaternion);
        return this.vector.clone();
    }

    setPosition(x, y, z) {
        this.camera.position.set(x, y, z);
    }

    getPosition() {
        return this.camera.position.clone();
    }
}
