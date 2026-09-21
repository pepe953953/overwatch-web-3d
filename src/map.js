import * as THREE from 'three';

export class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.jumpPads = [];
        this.healthPacks = [];
        this.capturePoint = null;

        this.initMaterials();
        this.buildEnvironment();
    }

    initMaterials() {
        this.materials = {
            floor: new THREE.MeshStandardMaterial({
                color: 0x272e38,
                roughness: 0.6,
                metalness: 0.3
            }),
            floorAccent: new THREE.MeshStandardMaterial({
                color: 0x3a4454,
                roughness: 0.5,
                metalness: 0.4
            }),
            wallWhite: new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                roughness: 0.4,
                metalness: 0.2
            }),
            wallDark: new THREE.MeshStandardMaterial({
                color: 0x1a202c,
                roughness: 0.5,
                metalness: 0.7
            }),
            barrierOrange: new THREE.MeshStandardMaterial({
                color: 0xdd6b20,
                roughness: 0.3,
                metalness: 0.2
            }),
            padGlowGreen: new THREE.MeshBasicMaterial({
                color: 0x00ff88
            }),
            packGlowCyan: new THREE.MeshBasicMaterial({
                color: 0x00d2ff,
                transparent: true,
                opacity: 0.85
            }),
            packGlowGold: new THREE.MeshBasicMaterial({
                color: 0xffb703,
                transparent: true,
                opacity: 0.85
            }),
            captureRing: new THREE.MeshBasicMaterial({
                color: 0x3182ce,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7
            })
        };
    }

    buildEnvironment() {
        // --- 1. Main Ground Floor ---
        const groundGeo = new THREE.BoxGeometry(100, 2, 100);
        const ground = new THREE.Mesh(groundGeo, this.materials.floor);
        ground.position.y = -1;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.colliders.push({ box: new THREE.Box3().setFromObject(ground) });

        // Decorative floor panels and lanes
        for (let i = -40; i <= 40; i += 20) {
            const laneGeo = new THREE.BoxGeometry(2, 0.05, 90);
            const lane = new THREE.Mesh(laneGeo, this.materials.floorAccent);
            lane.position.set(i, 0.02, 0);
            this.scene.add(lane);
        }

        // --- 2. High Ground Platforms ---
        // Sniper / High Platform Left
        this.createPlatform(-22, 5, 10, 16, 1, 24, this.materials.wallWhite);
        // Ramp to Left Platform
        this.createRamp(-22, 2.5, 27, 8, 1, 12, 0.4);

        // High Ground Observation Deck Right
        this.createPlatform(22, 6, -10, 18, 1, 26, this.materials.wallWhite);
        // Ramp to Right Platform
        this.createRamp(22, 3, 8, 8, 1, 14, -0.42);

        // Center Obstacle Pillars & Cover
        this.createCover(-8, 2, -12, 4, 4, 1.5);
        this.createCover(8, 2, -12, 4, 4, 1.5);
        this.createCover(0, 2.5, 15, 6, 5, 2);

        // Perimeter Boundary Walls
        this.createWall(0, 6, -48, 96, 12, 4);
        this.createWall(0, 6, 48, 96, 12, 4);
        this.createWall(-48, 6, 0, 4, 12, 96);
        this.createWall(48, 6, 0, 4, 12, 96);

        // --- 3. Jump Pads ---
        this.createJumpPad(new THREE.Vector3(-10, 0.05, 22), 22);
        this.createJumpPad(new THREE.Vector3(10, 0.05, 22), 22);

        // --- 4. Health Pack Stations ---
        // Small Packs (+75 HP)
        this.createHealthPack(new THREE.Vector3(-16, 0.5, -15), 'small', 75, 10);
        this.createHealthPack(new THREE.Vector3(16, 0.5, -15), 'small', 75, 10);
        // Mega Packs (+250 HP)
        this.createHealthPack(new THREE.Vector3(0, 0.5, -28), 'mega', 250, 15);
        this.createHealthPack(new THREE.Vector3(-22, 5.5, 10), 'mega', 250, 15);

        // --- 5. Capture Point A (거점 A) ---
        this.buildCapturePoint(new THREE.Vector3(0, 0.05, -5), 7.0);

        // --- 6. Lighting & Sky ---
        this.setupLighting();
    }

    createPlatform(x, y, z, w, h, d, mat) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat || this.materials.wallWhite);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.colliders.push({ box: new THREE.Box3().setFromObject(mesh) });

        // Safety Railing
        const railMat = this.materials.wallDark;
        const r1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.3), railMat);
        r1.position.set(x, y + 0.8, z - d / 2);
        this.scene.add(r1);
        this.colliders.push({ box: new THREE.Box3().setFromObject(r1) });
    }

    createRamp(x, y, z, w, h, d, rotX) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, this.materials.wallDark);
        mesh.position.set(x, y, z);
        mesh.rotation.x = rotX;
        this.scene.add(mesh);
        this.colliders.push({ box: new THREE.Box3().setFromObject(mesh) });
    }

    createCover(x, y, z, w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, this.materials.barrierOrange);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.colliders.push({ box: new THREE.Box3().setFromObject(mesh) });
    }

    createWall(x, y, z, w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, this.materials.wallDark);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.colliders.push({ box: new THREE.Box3().setFromObject(mesh) });
    }

    createJumpPad(position, force = 20) {
        const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.15, 16);
        const base = new THREE.Mesh(baseGeo, this.materials.wallDark);
        base.position.copy(position);
        this.scene.add(base);

        const padGeo = new THREE.RingGeometry(0.2, 1.3, 16);
        padGeo.rotateX(-Math.PI / 2);
        const pad = new THREE.Mesh(padGeo, this.materials.padGlowGreen);
        pad.position.copy(position);
        pad.position.y += 0.1;
        this.scene.add(pad);

        // Arrow icon in center pointing up
        const arrowGeo = new THREE.ConeGeometry(0.5, 0.8, 8);
        const arrow = new THREE.Mesh(arrowGeo, this.materials.padGlowGreen);
        arrow.position.copy(position);
        arrow.position.y += 0.6;
        this.scene.add(arrow);

        this.jumpPads.push({
            position: position.clone(),
            radius: 1.6,
            force: force,
            mesh: pad,
            arrow: arrow,
            cooldown: 0
        });
    }

    createHealthPack(position, type, healAmount, respawnDelay) {
        const baseGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.15, 12);
        const base = new THREE.Mesh(baseGeo, this.materials.wallDark);
        base.position.copy(position);
        this.scene.add(base);

        // Cross shape geometry
        const crossGroup = new THREE.Group();
        const mat = (type === 'mega') ? this.materials.packGlowGold : this.materials.packGlowCyan;
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.22), mat);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), mat);
        crossGroup.add(b1, b2);

        if (type === 'mega') {
            crossGroup.scale.set(1.4, 1.4, 1.4);
        }

        crossGroup.position.copy(position);
        crossGroup.position.y += 0.9;
        this.scene.add(crossGroup);

        this.healthPacks.push({
            position: position.clone(),
            type: type,
            healAmount: healAmount,
            respawnDelay: respawnDelay,
            timer: 0,
            isAvailable: true,
            mesh: crossGroup,
            radius: 1.2
        });
    }

    buildCapturePoint(position, radius = 7.0) {
        const ringGeo = new THREE.RingGeometry(radius - 0.2, radius, 48);
        ringGeo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, this.materials.captureRing);
        ring.position.copy(position);
        ring.position.y += 0.05;
        this.scene.add(ring);

        // Central beacon pillar
        const pillarGeo = new THREE.CylinderGeometry(0.4, 0.6, 4.0, 16);
        const pillar = new THREE.Mesh(pillarGeo, this.materials.wallDark);
        pillar.position.set(position.x, position.y + 2.0, position.z);
        this.scene.add(pillar);

        const beaconTop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3182ce }));
        beaconTop.position.set(position.x, position.y + 4.2, position.z);
        this.scene.add(beaconTop);

        this.capturePoint = {
            position: position.clone(),
            radius: radius,
            ring: ring,
            beaconTop: beaconTop,
            progress: 0, // 0 to 100%
            isCaptured: false,
            isPlayerInside: false
        };
    }

    setupLighting() {
        // Ambient skylight
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.7);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // Main sunlight
        const dirLight = new THREE.DirectionalLight(0xfffaed, 1.1);
        dirLight.position.set(30, 45, 25);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Beautiful sky dome gradient
        this.scene.background = new THREE.Color(0x70b0ff);
        this.scene.fog = new THREE.Fog(0x70b0ff, 45, 110);
    }

    update(delta, playerPos, onHealthPickup, onJumpPadTrigger) {
        // Animate Jump Pads
        for (const pad of this.jumpPads) {
            if (pad.arrow) {
                pad.arrow.position.y = pad.position.y + 0.6 + Math.sin(Date.now() * 0.008) * 0.15;
            }
            if (pad.cooldown > 0) pad.cooldown -= delta;

            if (playerPos && pad.cooldown <= 0) {
                const d = new THREE.Vector2(playerPos.x - pad.position.x, playerPos.z - pad.position.z).length();
                if (d < pad.radius && Math.abs(playerPos.y - pad.position.y) < 1.5) {
                    pad.cooldown = 0.8;
                    if (onJumpPadTrigger) onJumpPadTrigger(pad.force);
                }
            }
        }

        // Animate Health Packs
        for (const pack of this.healthPacks) {
            if (pack.isAvailable) {
                pack.mesh.rotation.y += delta * 2.0;
                pack.mesh.position.y = pack.position.y + 0.9 + Math.sin(Date.now() * 0.005) * 0.12;

                if (playerPos) {
                    const d = new THREE.Vector2(playerPos.x - pack.position.x, playerPos.z - pack.position.z).length();
                    if (d < pack.radius && Math.abs(playerPos.y - pack.position.y) < 2.0) {
                        pack.isAvailable = false;
                        pack.mesh.visible = false;
                        pack.timer = pack.respawnDelay;
                        if (onHealthPickup) onHealthPickup(pack.healAmount, pack.type);
                    }
                }
            } else {
                pack.timer -= delta;
                if (pack.timer <= 0) {
                    pack.isAvailable = true;
                    pack.mesh.visible = true;
                }
            }
        }

        // Update Capture Point
        if (this.capturePoint && playerPos) {
            const cp = this.capturePoint;
            const dist = new THREE.Vector2(playerPos.x - cp.position.x, playerPos.z - cp.position.z).length();
            cp.isPlayerInside = (dist <= cp.radius && Math.abs(playerPos.y - cp.position.y) < 3.0);

            if (cp.isPlayerInside && !cp.isCaptured) {
                cp.progress = Math.min(100, cp.progress + delta * 12.0);
                if (cp.progress >= 100) {
                    cp.isCaptured = true;
                    cp.ring.material.color.setHex(0x00ff88);
                    cp.beaconTop.material.color.setHex(0x00ff88);
                }
            }
            cp.ring.rotation.z += delta * 0.3;
        }
    }
}
