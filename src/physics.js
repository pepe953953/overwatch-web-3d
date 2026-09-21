import * as THREE from 'three';

export class PlayerPhysics {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.position = new THREE.Vector3(0, 1.8, 30);
        this.velocity = new THREE.Vector3();
        this.camera.position.copy(this.position);

        // Rotation
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;

        // States
        this.isGrounded = false;
        this.canDoubleJump = false;
        this.hasDoubleJumped = false;
        this.gravity = -30.0;
        this.jumpForce = 11.5;

        // Input
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
        };

        // Recall buffer (stores [time, position, hp] for 3 seconds)
        this.recallHistory = [];

        this.setupPointerLock();
    }

    setupPointerLock() {
        this.isLocked = false;

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = (document.pointerLockElement === this.domElement);
        });

        document.addEventListener('mousemove', (event) => {
            if (!this.isLocked) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            this.lookDeltaX = movementX;
            this.lookDeltaY = movementY;

            this.euler.y -= movementX * 0.0022;
            this.euler.x -= movementY * 0.0022;
            this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));

            this.camera.quaternion.setFromEuler(this.euler);
        });
    }

    lock() {
        this.domElement.requestPointerLock();
    }

    unlock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    getForwardVector() {
        const v = new THREE.Vector3(0, 0, -1);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);
        return v.normalize();
    }

    getRightVector() {
        const v = new THREE.Vector3(1, 0, 0);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);
        return v.normalize();
    }

    getAimDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyEuler(this.euler);
        return dir.normalize();
    }

    recordHistory(currentHp) {
        const now = performance.now();
        this.recallHistory.push({
            time: now,
            pos: this.position.clone(),
            hp: currentHp
        });

        // Prune older than 3.0 seconds
        while (this.recallHistory.length > 0 && (now - this.recallHistory[0].time) > 3000) {
            this.recallHistory.shift();
        }
    }

    getRecallState() {
        if (this.recallHistory.length === 0) return null;
        return this.recallHistory[0];
    }

    performBlink(distance = 8.5, colliders = []) {
        // Blink in movement direction, or forward if stationary
        let dir = new THREE.Vector3();
        const fwd = this.getForwardVector();
        const right = this.getRightVector();

        if (this.keys.forward) dir.add(fwd);
        if (this.keys.backward) dir.sub(fwd);
        if (this.keys.right) dir.add(right);
        if (this.keys.left) dir.sub(right);

        if (dir.lengthSq() < 0.001) {
            dir = fwd;
        } else {
            dir.normalize();
        }

        // Raycast / step collision check for blink
        const targetPos = this.position.clone().addScaledVector(dir, distance);
        this.position.copy(targetPos);
        this.clampToBounds();
    }

    performSwiftStrike(distance = 14.0) {
        const dir = this.getAimDirection();
        this.position.addScaledVector(dir, distance);
        this.velocity.set(0, 0, 0);
        this.clampToBounds();
    }

    clampToBounds() {
        this.position.x = Math.max(-46, Math.min(46, this.position.x));
        this.position.z = Math.max(-46, Math.min(46, this.position.z));
        this.position.y = Math.max(1.8, this.position.y);
    }

    update(delta, baseSpeed, isSprinting, allowDoubleJump, colliders = []) {
        // Reset look deltas after a frame
        this.lookDeltaX *= 0.1;
        this.lookDeltaY *= 0.1;

        // Ground detection
        const floorY = 1.8;
        let groundHeight = floorY;

        // Check if on top of any platform
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(this.position.x, this.position.y - 0.9, this.position.z),
            new THREE.Vector3(0.8, 1.8, 0.8)
        );

        for (const col of colliders) {
            if (col.box.intersectsBox(playerBox)) {
                if (this.position.y - 1.8 >= col.box.max.y - 0.5 && this.velocity.y <= 0) {
                    groundHeight = Math.max(groundHeight, col.box.max.y + 1.8);
                }
            }
        }

        if (this.position.y <= groundHeight + 0.05) {
            this.position.y = groundHeight;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.hasDoubleJumped = false;
        } else {
            this.isGrounded = false;
            this.velocity.y += this.gravity * delta;
        }

        // Jump handling
        if (this.keys.jump) {
            if (this.isGrounded) {
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.keys.jump = false; // consume trigger
            } else if (allowDoubleJump && !this.hasDoubleJumped) {
                // Genji double jump
                this.velocity.y = this.jumpForce * 0.95;
                this.hasDoubleJumped = true;
                this.keys.jump = false;
            }
        }

        // Horizontal movement
        const currentSpeed = isSprinting ? baseSpeed * 1.55 : baseSpeed;
        const moveDir = new THREE.Vector3();
        const fwd = this.getForwardVector();
        const right = this.getRightVector();

        if (this.keys.forward) moveDir.add(fwd);
        if (this.keys.backward) moveDir.sub(fwd);
        if (this.keys.right) moveDir.add(right);
        if (this.keys.left) moveDir.sub(right);

        if (moveDir.lengthSq() > 0.001) {
            moveDir.normalize();
            this.velocity.x = moveDir.x * currentSpeed;
            this.velocity.z = moveDir.z * currentSpeed;
        } else {
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, delta * 14);
            this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, delta * 14);
        }

        // Apply movement
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        this.clampToBounds();
        this.camera.position.copy(this.position);
    }
}
