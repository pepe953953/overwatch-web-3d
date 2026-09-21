import * as THREE from 'three';

export class WeaponSystem {
    constructor(camera) {
        this.camera = camera;
        this.weaponContainer = new THREE.Group();
        this.camera.add(this.weaponContainer);

        this.currentHeroId = null;
        this.models = {};

        // Animation states
        this.recoilOffset = new THREE.Vector3();
        this.recoilRotation = new THREE.Euler();
        this.bobbing = { time: 0, x: 0, y: 0 };
        this.sway = { x: 0, y: 0 };
        this.isReloading = false;
        this.reloadProgress = 0;
        this.isDeflecting = false;
        this.isDragonblade = false;
        this.swordSwingAnim = 0;

        this.initMaterials();
        this.buildAllWeapons();
    }

    initMaterials() {
        this.materials = {
            gunMetal: new THREE.MeshStandardMaterial({
                color: 0x1f242d,
                roughness: 0.3,
                metalness: 0.85
            }),
            gunAccentBlue: new THREE.MeshStandardMaterial({
                color: 0x2b6cb0,
                roughness: 0.4,
                metalness: 0.5
            }),
            gunGlowBlue: new THREE.MeshBasicMaterial({
                color: 0x00d2ff
            }),
            tracerWhite: new THREE.MeshStandardMaterial({
                color: 0xedf2f7,
                roughness: 0.2,
                metalness: 0.6
            }),
            tracerOrange: new THREE.MeshStandardMaterial({
                color: 0xdd6b20,
                roughness: 0.3,
                metalness: 0.4
            }),
            tracerGlowOrange: new THREE.MeshBasicMaterial({
                color: 0xffaa00
            }),
            genjiCyborg: new THREE.MeshStandardMaterial({
                color: 0x2d3748,
                roughness: 0.25,
                metalness: 0.8
            }),
            genjiWhite: new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                roughness: 0.3,
                metalness: 0.7
            }),
            genjiGreenGlow: new THREE.MeshBasicMaterial({
                color: 0x00ff66
            }),
            bladeMetal: new THREE.MeshStandardMaterial({
                color: 0x1a202c,
                roughness: 0.1,
                metalness: 0.95
            })
        };
    }

    buildAllWeapons() {
        this.models.soldier76 = this.buildSoldierRifle();
        this.models.tracer = this.buildTracerPistols();
        this.models.genji = this.buildGenjiWeapons();

        // Add all to container but hide them
        for (const key in this.models) {
            this.models[key].visible = false;
            this.weaponContainer.add(this.models[key]);
        }
    }

    buildSoldierRifle() {
        const group = new THREE.Group();

        // Main rifle body
        const bodyGeo = new THREE.BoxGeometry(0.12, 0.14, 0.7);
        const body = new THREE.Mesh(bodyGeo, this.materials.gunMetal);
        body.position.set(0, 0, 0);
        group.add(body);

        // Top blue shroud
        const topGeo = new THREE.BoxGeometry(0.1, 0.05, 0.55);
        const top = new THREE.Mesh(topGeo, this.materials.gunAccentBlue);
        top.position.set(0, 0.09, -0.05);
        group.add(top);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.35, 12);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.materials.gunMetal);
        barrel.position.set(0, 0.02, -0.45);
        group.add(barrel);

        // Ammo counter holographic display
        const displayGeo = new THREE.PlaneGeometry(0.08, 0.05);
        const displayMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide });
        const display = new THREE.Mesh(displayGeo, displayMat);
        display.rotation.x = -Math.PI / 4;
        display.position.set(0, 0.12, 0.15);
        group.add(display);

        // Glowing blue power vents
        const ventLeft = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.3), this.materials.gunGlowBlue);
        ventLeft.position.set(-0.065, 0.02, -0.1);
        group.add(ventLeft);
        const ventRight = ventLeft.clone();
        ventRight.position.set(0.065, 0.02, -0.1);
        group.add(ventRight);

        // Stock and grip
        const gripGeo = new THREE.BoxGeometry(0.07, 0.2, 0.08);
        gripGeo.rotateX(0.2);
        const grip = new THREE.Mesh(gripGeo, this.materials.gunMetal);
        grip.position.set(0, -0.12, 0.18);
        group.add(grip);

        // Muzzle point indicator
        const muzzlePoint = new THREE.Object3D();
        muzzlePoint.position.set(0, 0.02, -0.65);
        group.add(muzzlePoint);
        group.userData.muzzlePoint = muzzlePoint;

        // Base transform in first person view
        group.position.set(0.3, -0.26, -0.55);
        group.rotation.set(0.02, -0.03, 0);

        return group;
    }

    buildTracerPistols() {
        const group = new THREE.Group();

        const buildPistol = (isLeft) => {
            const pistol = new THREE.Group();

            // Main chassis
            const chassisGeo = new THREE.BoxGeometry(0.08, 0.1, 0.35);
            const chassis = new THREE.Mesh(chassisGeo, this.materials.tracerWhite);
            pistol.add(chassis);

            // Orange side trims
            const trimGeo = new THREE.BoxGeometry(0.085, 0.04, 0.25);
            const trim = new THREE.Mesh(trimGeo, this.materials.tracerOrange);
            trim.position.set(0, 0.03, 0);
            pistol.add(trim);

            // Chrono glowing orange ring/battery
            const ringGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16);
            ringGeo.rotateZ(Math.PI / 2);
            const ring = new THREE.Mesh(ringGeo, this.materials.tracerGlowOrange);
            ring.position.set(isLeft ? -0.045 : 0.045, 0.01, 0.08);
            pistol.add(ring);

            // Dual micro barrels
            const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8).rotateX(Math.PI / 2), this.materials.gunMetal);
            b1.position.set(-0.02, 0.02, -0.2);
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8).rotateX(Math.PI / 2), this.materials.gunMetal);
            b2.position.set(0.02, 0.02, -0.2);
            pistol.add(b1, b2);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06).rotateX(0.25), this.materials.gunMetal);
            grip.position.set(0, -0.1, 0.08);
            pistol.add(grip);

            const muzzle = new THREE.Object3D();
            muzzle.position.set(0, 0.02, -0.26);
            pistol.add(muzzle);
            pistol.userData.muzzle = muzzle;

            return pistol;
        };

        const leftPistol = buildPistol(true);
        leftPistol.position.set(-0.25, -0.22, -0.45);
        leftPistol.rotation.set(0.04, 0.08, -0.05);

        const rightPistol = buildPistol(false);
        rightPistol.position.set(0.25, -0.22, -0.45);
        rightPistol.rotation.set(0.04, -0.08, 0.05);

        group.add(leftPistol);
        group.add(rightPistol);
        group.userData.left = leftPistol;
        group.userData.right = rightPistol;

        return group;
    }

    buildGenjiWeapons() {
        const group = new THREE.Group();

        // 1. Shuriken Hand (Left cybernetic hand)
        const handGroup = new THREE.Group();
        const palmGeo = new THREE.BoxGeometry(0.08, 0.04, 0.12);
        const palm = new THREE.Mesh(palmGeo, this.materials.genjiCyborg);
        handGroup.add(palm);

        // Cybernetic white armor plates
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.1), this.materials.genjiWhite);
        plate.position.set(0, 0.025, 0);
        handGroup.add(plate);

        // Glowing green cyber veins
        const vein = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.026, 0.08), this.materials.genjiGreenGlow);
        vein.position.set(0, 0.026, 0);
        handGroup.add(vein);

        // Ready shurikens protruding from wrist dispenser
        for (let i = 0; i < 3; i++) {
            const shurikenGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.005, 4);
            shurikenGeo.rotateY(Math.PI / 4 + i * 0.3);
            const shuriken = new THREE.Mesh(shurikenGeo, this.materials.bladeMetal);
            shuriken.position.set(-0.02 + i * 0.02, 0.035, -0.06 - i * 0.02);
            handGroup.add(shuriken);
        }

        handGroup.position.set(-0.25, -0.22, -0.45);
        handGroup.rotation.set(0.2, 0.4, -0.3);
        group.add(handGroup);
        group.userData.hand = handGroup;

        // 2. Dragonblade Katana (used for Deflect and Ultimate)
        const swordGroup = new THREE.Group();

        // Katana blade
        const bladeGeo = new THREE.BoxGeometry(0.02, 0.05, 1.1);
        const blade = new THREE.Mesh(bladeGeo, this.materials.bladeMetal);
        blade.position.set(0, 0, -0.55);
        swordGroup.add(blade);

        // Glowing Neon Dragon Edge
        const edgeGeo = new THREE.BoxGeometry(0.008, 0.015, 1.08);
        const edge = new THREE.Mesh(edgeGeo, this.materials.genjiGreenGlow);
        edge.position.set(0, 0.026, -0.55);
        swordGroup.add(edge);

        // Tsuba (guard)
        const tsubaGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 8);
        tsubaGeo.rotateX(Math.PI / 2);
        const tsuba = new THREE.Mesh(tsubaGeo, this.materials.genjiWhite);
        tsuba.position.set(0, 0, 0);
        swordGroup.add(tsuba);

        // Hilt
        const hiltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8);
        hiltGeo.rotateX(Math.PI / 2);
        const hilt = new THREE.Mesh(hiltGeo, this.materials.genjiCyborg);
        hilt.position.set(0, 0, 0.15);
        swordGroup.add(hilt);

        // Deflect / Sword default position (hidden initially)
        swordGroup.position.set(0.18, -0.25, -0.45);
        swordGroup.rotation.set(-0.3, 0.4, -0.5);
        swordGroup.visible = false;

        group.add(swordGroup);
        group.userData.sword = swordGroup;

        return group;
    }

    setHero(heroId) {
        this.currentHeroId = heroId;
        for (const key in this.models) {
            this.models[key].visible = (key === heroId);
        }
        this.isDragonblade = false;
        this.isDeflecting = false;
        if (heroId === 'genji') {
            this.models.genji.userData.sword.visible = false;
            this.models.genji.userData.hand.visible = true;
        }
    }

    triggerShootAnimation(isLeft = false) {
        if (this.currentHeroId === 'soldier76') {
            this.recoilOffset.z = 0.07;
            this.recoilOffset.y = 0.02;
            this.recoilRotation.x = 0.06;
        } else if (this.currentHeroId === 'tracer') {
            const p = isLeft ? this.models.tracer.userData.left : this.models.tracer.userData.right;
            p.position.z += 0.05;
            p.rotation.x += 0.08;
        } else if (this.currentHeroId === 'genji') {
            const hand = this.models.genji.userData.hand;
            hand.position.z += 0.1;
            hand.rotation.x -= 0.15;
        }
    }

    triggerSwordSlash() {
        this.swordSwingAnim = 1.0;
    }

    setDragonblade(active) {
        this.isDragonblade = active;
        if (this.currentHeroId === 'genji') {
            const sword = this.models.genji.userData.sword;
            const hand = this.models.genji.userData.hand;
            if (active) {
                sword.visible = true;
                hand.visible = false;
                sword.position.set(0.2, -0.2, -0.45);
                sword.rotation.set(0.2, -0.5, 0.3);
            } else {
                sword.visible = false;
                hand.visible = true;
            }
        }
    }

    setDeflect(active) {
        this.isDeflecting = active;
        if (this.currentHeroId === 'genji' && !this.isDragonblade) {
            const sword = this.models.genji.userData.sword;
            const hand = this.models.genji.userData.hand;
            if (active) {
                sword.visible = true;
                hand.visible = false;
                sword.position.set(0, -0.1, -0.38);
                sword.rotation.set(0, 0, Math.PI / 4);
            } else {
                sword.visible = false;
                hand.visible = true;
            }
        }
    }

    update(delta, isMoving, isSprinting, lookDeltaX = 0, lookDeltaY = 0) {
        // Natural viewmodel sway with mouse movement
        this.sway.x += (-lookDeltaX * 0.0006 - this.sway.x) * 10 * delta;
        this.sway.y += (-lookDeltaY * 0.0006 - this.sway.y) * 10 * delta;

        // Walking bobbing
        if (isMoving) {
            const bobSpeed = isSprinting ? 16 : 10;
            const bobAmount = isSprinting ? 0.035 : 0.018;
            this.bobbing.time += delta * bobSpeed;
            this.bobbing.x = Math.cos(this.bobbing.time * 0.5) * bobAmount * 0.8;
            this.bobbing.y = Math.sin(this.bobbing.time) * bobAmount;
        } else {
            // Idle gentle breathing
            this.bobbing.time += delta * 2.0;
            this.bobbing.x = 0;
            this.bobbing.y = Math.sin(this.bobbing.time) * 0.004;
        }

        // Recoil decay
        this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), delta * 18);
        this.recoilRotation.x = THREE.MathUtils.lerp(this.recoilRotation.x, 0, delta * 18);

        // Apply to container
        this.weaponContainer.position.set(
            this.bobbing.x + this.sway.x + this.recoilOffset.x,
            this.bobbing.y + this.sway.y + this.recoilOffset.y,
            this.recoilOffset.z
        );
        this.weaponContainer.rotation.set(
            this.recoilRotation.x + this.sway.y * 0.5,
            this.sway.x * 0.5,
            0
        );

        // Hero-specific updates
        if (this.currentHeroId === 'soldier76') {
            const m = this.models.soldier76;
            if (isSprinting) {
                // Lower weapon when sprinting
                m.position.y = THREE.MathUtils.lerp(m.position.y, -0.38, delta * 8);
                m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, -0.4, delta * 8);
            } else {
                m.position.y = THREE.MathUtils.lerp(m.position.y, -0.26, delta * 12);
                m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, 0.02, delta * 12);
            }
        } else if (this.currentHeroId === 'tracer') {
            const left = this.models.tracer.userData.left;
            const right = this.models.tracer.userData.right;
            left.position.lerp(new THREE.Vector3(-0.25, -0.22, -0.45), delta * 15);
            right.position.lerp(new THREE.Vector3(0.25, -0.22, -0.45), delta * 15);
            left.rotation.x = THREE.MathUtils.lerp(left.rotation.x, 0.04, delta * 15);
            right.rotation.x = THREE.MathUtils.lerp(right.rotation.x, 0.04, delta * 15);
        } else if (this.currentHeroId === 'genji') {
            const hand = this.models.genji.userData.hand;
            hand.position.lerp(new THREE.Vector3(-0.25, -0.22, -0.45), delta * 12);
            hand.rotation.x = THREE.MathUtils.lerp(hand.rotation.x, 0.2, delta * 12);

            const sword = this.models.genji.userData.sword;
            if (this.swordSwingAnim > 0) {
                this.swordSwingAnim = Math.max(0, this.swordSwingAnim - delta * 4);
                // Swing slash arc across screen
                const t = 1.0 - this.swordSwingAnim;
                sword.rotation.z = Math.PI * 0.8 - t * Math.PI * 1.2;
                sword.rotation.y = -0.4 + t * 0.8;
                sword.position.x = 0.3 - t * 0.6;
            } else if (this.isDragonblade) {
                sword.rotation.set(0.2, -0.5, 0.3);
                sword.position.set(0.2, -0.2, -0.45);
            }
        }
    }
}
