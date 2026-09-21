import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
        this.particles = [];
        this.rings = [];
        this.damageNumbers = [];
        this.deployables = [];

        this.initTexturesAndMaterials();
    }

    initTexturesAndMaterials() {
        // Tracer line material
        this.tracerMaterial = new THREE.LineBasicMaterial({
            color: 0x63b3ed,
            transparent: true,
            opacity: 0.9,
            linewidth: 2
        });

        // Spark materials
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide });
        this.sparkMatRed = new THREE.MeshBasicMaterial({ color: 0xff3366, side: THREE.DoubleSide });
        this.greenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
        this.blueMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide });
    }

    // --- BULLET TRACERS ---
    createBulletTracer(startPos, endPos, color = 0x63b3ed) {
        const points = [startPos.clone(), endPos.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.85 });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.particles.push({
            object: line,
            life: 0.08,
            maxLife: 0.08,
            update: (p, dt) => {
                p.life -= dt;
                mat.opacity = p.life / p.maxLife;
                if (p.life <= 0) {
                    this.scene.remove(line);
                    geo.dispose();
                    mat.dispose();
                    return false;
                }
                return true;
            }
        });
    }

    // --- HIT SPARKS ---
    createHitSparks(position, normal, isCritical = false) {
        const count = isCritical ? 14 : 7;
        const colorMat = isCritical ? this.sparkMatRed : this.sparkMat;
        const geo = new THREE.PlaneGeometry(0.04, 0.04);

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, colorMat);
            mesh.position.copy(position);
            mesh.quaternion.random();
            this.scene.add(mesh);

            const velocity = (normal ? normal.clone() : new THREE.Vector3(0, 1, 0)).multiplyScalar(2 + Math.random() * 4);
            velocity.x += (Math.random() - 0.5) * 6;
            velocity.y += (Math.random() - 0.5) * 6;
            velocity.z += (Math.random() - 0.5) * 6;

            this.particles.push({
                object: mesh,
                velocity: velocity,
                life: 0.25 + Math.random() * 0.15,
                maxLife: 0.4,
                update: (p, dt) => {
                    p.life -= dt;
                    p.velocity.y -= 9.8 * dt;
                    mesh.position.addScaledVector(p.velocity, dt);
                    mesh.scale.setScalar(p.life / p.maxLife);
                    if (p.life <= 0) {
                        this.scene.remove(mesh);
                        return false;
                    }
                    return true;
                }
            });
        }
    }

    // --- FLOATING COMBAT TEXT (3D Damage Numbers) ---
    createDamageNumber(position, damage, isCritical = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.font = `bold ${isCritical ? '48px' : '36px'} 'Impact', 'Arial Black', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer stroke
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(Math.round(damage).toString(), 64, 32);

        // Fill
        ctx.fillStyle = isCritical ? '#ff1e56' : '#ffffff';
        ctx.fillText(Math.round(damage).toString(), 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(position);
        sprite.position.x += (Math.random() - 0.5) * 0.4;
        sprite.position.y += 0.3 + Math.random() * 0.3;
        sprite.scale.set(isCritical ? 0.9 : 0.6, isCritical ? 0.45 : 0.3, 1);
        this.scene.add(sprite);

        this.particles.push({
            object: sprite,
            life: 0.6,
            maxLife: 0.6,
            update: (p, dt) => {
                p.life -= dt;
                sprite.position.y += 1.2 * dt;
                mat.opacity = Math.min(1.0, p.life * 2.5);
                if (p.life <= 0) {
                    this.scene.remove(sprite);
                    texture.dispose();
                    mat.dispose();
                    return false;
                }
                return true;
            }
        });
    }

    // --- HELIX ROCKETS (Soldier: 76) ---
    spawnHelixRockets(startPos, direction, onHitCallback) {
        const count = 3;
        const speed = 50;

        for (let i = 0; i < count; i++) {
            const rocketGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
            rocketGeo.rotateX(Math.PI / 2);
            const rocketMat = new THREE.MeshStandardMaterial({
                color: 0x3182ce,
                emissive: 0x00a3c4,
                emissiveIntensity: 0.6
            });
            const mesh = new THREE.Mesh(rocketGeo, rocketMat);
            mesh.position.copy(startPos);
            this.scene.add(mesh);

            this.projectiles.push({
                object: mesh,
                type: 'helix',
                direction: direction.clone(),
                speed: speed,
                origin: startPos.clone(),
                distanceTraveled: 0,
                maxDistance: 80,
                radius: 0.25,
                index: i,
                helixAngle: (i * (Math.PI * 2 / 3)),
                onHit: onHitCallback
            });
        }
    }

    // --- BIOTIC FIELD (Soldier: 76) ---
    spawnBioticField(position, radius = 5.0, duration = 5.0) {
        const ringGeo = new THREE.RingGeometry(radius - 0.15, radius, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00d2ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.05;
        this.scene.add(ring);

        // Center beacon device
        const beaconGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.2, 12);
        const beaconMat = new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.3 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.copy(position);
        beacon.position.y += 0.1;
        this.scene.add(beacon);

        // Deployable object with area of effect
        const field = {
            position: position.clone(),
            radius: radius,
            life: duration,
            maxLife: duration,
            ring: ring,
            beacon: beacon,
            spawnTimer: 0,
            update: (dt) => {
                field.life -= dt;
                ring.rotation.y += dt * 0.5;
                field.spawnTimer += dt;

                // Emit rising glowing pluses / healing motes
                if (field.spawnTimer > 0.1) {
                    field.spawnTimer = 0;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * (radius - 0.5);
                    const spawnPos = new THREE.Vector3(
                        position.x + Math.cos(angle) * dist,
                        position.y + 0.1,
                        position.z + Math.sin(angle) * dist
                    );

                    const plus = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0x63b3ed, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
                    plus.position.copy(spawnPos);
                    this.scene.add(plus);

                    this.particles.push({
                        object: plus,
                        life: 0.8,
                        maxLife: 0.8,
                        update: (p, pdt) => {
                            p.life -= pdt;
                            plus.position.y += pdt * 1.5;
                            plus.material.opacity = p.life / p.maxLife * 0.7;
                            if (p.life <= 0) {
                                this.scene.remove(plus);
                                plus.geometry.dispose();
                                plus.material.dispose();
                                return false;
                            }
                            return true;
                        }
                    });
                }

                if (field.life <= 0) {
                    this.scene.remove(ring);
                    this.scene.remove(beacon);
                    ringGeo.dispose();
                    ringMat.dispose();
                    beaconGeo.dispose();
                    beaconMat.dispose();
                    return false;
                }
                return true;
            }
        };

        this.deployables.push(field);
        return field;
    }

    // --- GENJI SHURIKENS ---
    spawnShuriken(startPos, direction, onHitCallback) {
        const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.015, 4);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.5,
            metalness: 0.9,
            roughness: 0.2
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        this.scene.add(mesh);

        this.projectiles.push({
            object: mesh,
            type: 'shuriken',
            direction: direction.clone(),
            speed: 65,
            origin: startPos.clone(),
            distanceTraveled: 0,
            maxDistance: 70,
            radius: 0.2,
            rotSpeed: 25,
            onHit: onHitCallback
        });
    }

    // --- GENJI DRAGONBLADE SLASH CRESCENT WAVE ---
    spawnSlashWave(startPos, direction, onHitCallback) {
        const geo = new THREE.TorusGeometry(1.4, 0.08, 8, 24, Math.PI * 0.6);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
        this.scene.add(mesh);

        this.projectiles.push({
            object: mesh,
            type: 'slash_wave',
            direction: direction.clone(),
            speed: 35,
            distanceTraveled: 0,
            maxDistance: 14,
            radius: 1.5,
            life: 0.4,
            maxLife: 0.4,
            onHit: onHitCallback
        });
    }

    // --- PULSE BOMB (Tracer) ---
    spawnPulseBomb(startPos, direction, onExplodeCallback) {
        const geo = new THREE.SphereGeometry(0.12, 12, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xdd6b20,
            emissive: 0x00d2ff,
            emissiveIntensity: 0.9
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        this.scene.add(mesh);

        let velocity = direction.clone().multiplyScalar(22);
        velocity.y += 3.5; // slight upward arc throw

        let isStuck = false;
        let stuckTarget = null;
        let fuse = 1.4;

        this.particles.push({
            object: mesh,
            isPulseBomb: true,
            update: (p, dt) => {
                fuse -= dt;

                // Pulsate cyan blink glow
                mesh.scale.setScalar(1.0 + Math.sin(fuse * 25) * 0.25);

                if (!isStuck) {
                    velocity.y -= 18.0 * dt;
                    mesh.position.addScaledVector(velocity, dt);

                    // Stop when near ground
                    if (mesh.position.y <= 0.12) {
                        mesh.position.y = 0.12;
                        velocity.set(0, 0, 0);
                        isStuck = true;
                    }
                }

                if (fuse <= 0) {
                    this.scene.remove(mesh);
                    geo.dispose();
                    mat.dispose();
                    this.createExplosionEffect(mesh.position, 4.5, 0x00d2ff);
                    if (onExplodeCallback) onExplodeCallback(mesh.position);
                    return false;
                }
                return true;
            }
        });
    }

    // --- EXPLOSION EFFECT (Shockwave sphere + particles) ---
    createExplosionEffect(position, radius = 3.5, baseColor = 0xff6600) {
        // Expanding shockwave sphere
        const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.8,
            wireframe: true
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(position);
        this.scene.add(sphere);

        this.particles.push({
            object: sphere,
            life: 0.35,
            maxLife: 0.35,
            update: (p, dt) => {
                p.life -= dt;
                const scale = (1.0 - p.life / p.maxLife) * radius * 2.0;
                sphere.scale.setScalar(Math.max(0.1, scale));
                sphereMat.opacity = (p.life / p.maxLife) * 0.8;
                if (p.life <= 0) {
                    this.scene.remove(sphere);
                    sphereGeo.dispose();
                    sphereMat.dispose();
                    return false;
                }
                return true;
            }
        });

        // Flying debris sparks
        this.createHitSparks(position, new THREE.Vector3(0, 1, 0), true);
    }

    // --- ENEMY BULLET ---
    spawnEnemyBullet(startPos, direction, speed = 25) {
        const geo = new THREE.SphereGeometry(0.1, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        this.scene.add(mesh);

        this.projectiles.push({
            object: mesh,
            type: 'enemy_laser',
            direction: direction.clone(),
            speed: speed,
            distanceTraveled: 0,
            maxDistance: 60,
            radius: 0.25
        });
    }

    update(delta, checkCollisionCallback) {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const moveStep = proj.speed * delta;
            proj.distanceTraveled += moveStep;

            if (proj.type === 'shuriken') {
                proj.object.rotation.z += proj.rotSpeed * delta;
            } else if (proj.type === 'helix') {
                proj.helixAngle += delta * 15;
                // Spiral offset
                const offset = new THREE.Vector3(
                    Math.cos(proj.helixAngle) * 0.12,
                    Math.sin(proj.helixAngle) * 0.12,
                    0
                );
                proj.object.position.add(offset);
            }

            proj.object.position.addScaledVector(proj.direction, moveStep);

            // Collision check
            let hit = false;
            if (checkCollisionCallback) {
                hit = checkCollisionCallback(proj);
            }

            if (hit || proj.distanceTraveled >= proj.maxDistance) {
                this.scene.remove(proj.object);
                if (proj.object.geometry) proj.object.geometry.dispose();
                if (proj.object.material) proj.object.material.dispose();
                this.projectiles.splice(i, 1);
            }
        }

        // Update deployables (e.g. Biotic field)
        for (let i = this.deployables.length - 1; i >= 0; i--) {
            const d = this.deployables[i];
            if (!d.update(delta)) {
                this.deployables.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (!p.update(p, delta)) {
                this.particles.splice(i, 1);
            }
        }
    }
}
