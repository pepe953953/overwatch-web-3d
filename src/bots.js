import * as THREE from 'three';

export class BotManager {
    constructor(scene) {
        this.scene = scene;
        this.bots = [];
        this.materials = this.initMaterials();
    }

    initMaterials() {
        return {
            omnicBody: new THREE.MeshStandardMaterial({
                color: 0x8a9ba8,
                metalness: 0.8,
                roughness: 0.3
            }),
            omnicWhite: new THREE.MeshStandardMaterial({
                color: 0xebf0f5,
                metalness: 0.5,
                roughness: 0.35
            }),
            omnicEyeRed: new THREE.MeshBasicMaterial({
                color: 0xff1e56
            }),
            omnicEyeYellow: new THREE.MeshBasicMaterial({
                color: 0xffaa00
            }),
            omnicBase: new THREE.MeshStandardMaterial({
                color: 0x242d38,
                metalness: 0.9,
                roughness: 0.4
            })
        };
    }

    createBot(id, name, type, spawnPos, patrolDistance = 0) {
        const group = new THREE.Group();
        group.position.copy(spawnPos);

        // --- 3D Model of Overwatch Training Omnic Bot ---
        // Base / Hover Thruster
        const baseGeo = new THREE.CylinderGeometry(0.5, 0.35, 0.4, 16);
        const base = new THREE.Mesh(baseGeo, this.materials.omnicBase);
        base.position.y = 0.2;
        group.add(base);

        // Torso
        const torsoGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.9, 16);
        const torso = new THREE.Mesh(torsoGeo, this.materials.omnicWhite);
        torso.position.y = 0.85;
        group.add(torso);

        // Torso chest plate / Overwatch orange band
        const bandGeo = new THREE.CylinderGeometry(0.56, 0.53, 0.2, 16);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0xdd6b20, roughness: 0.4 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 0.95;
        group.add(band);

        // Head (spherical Omnic head with single red optic eye)
        const headGeo = new THREE.SphereGeometry(0.38, 16, 16);
        const head = new THREE.Mesh(headGeo, this.materials.omnicBody);
        head.position.y = 1.55;
        group.add(head);

        // Optic Eye (CRITICAL HIT ZONE - HEADSHOT!)
        const eyeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
        eyeGeo.rotateX(Math.PI / 2);
        const eye = new THREE.Mesh(eyeGeo, this.materials.omnicEyeRed);
        eye.position.set(0, 1.55, 0.36);
        group.add(eye);

        // Robotic Arms
        const armGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.7, 8);
        const leftArm = new THREE.Mesh(armGeo, this.materials.omnicBody);
        leftArm.position.set(-0.7, 0.9, 0);
        leftArm.rotation.z = 0.2;
        group.add(leftArm);

        const rightArm = leftArm.clone();
        rightArm.position.x = 0.7;
        rightArm.rotation.z = -0.2;
        group.add(rightArm);

        // Combat bot blaster attached to right arm
        if (type === 'combat') {
            const gunGeo = new THREE.BoxGeometry(0.15, 0.15, 0.4);
            const gun = new THREE.Mesh(gunGeo, this.materials.omnicBase);
            gun.position.set(0.7, 0.55, 0.2);
            group.add(gun);
            group.userData.blaster = gun;
        }

        // --- Overhead Health Bar Sprite ---
        const hpCanvas = document.createElement('canvas');
        hpCanvas.width = 128;
        hpCanvas.height = 20;
        const hpCtx = hpCanvas.getContext('2d');
        const hpTexture = new THREE.CanvasTexture(hpCanvas);
        const hpMat = new THREE.SpriteMaterial({ map: hpTexture, transparent: true });
        const hpSprite = new THREE.Sprite(hpMat);
        hpSprite.position.set(0, 2.3, 0);
        hpSprite.scale.set(1.4, 0.22, 1);
        group.add(hpSprite);

        this.scene.add(group);

        const bot = {
            id: id,
            name: name,
            type: type,
            mesh: group,
            head: head,
            eye: eye,
            hpCanvas: hpCanvas,
            hpCtx: hpCtx,
            hpTexture: hpTexture,
            hpSprite: hpSprite,
            spawnPos: spawnPos.clone(),
            maxHp: 200,
            hp: 200,
            isAlive: true,
            respawnTimer: 0,
            patrolDistance: patrolDistance,
            patrolDir: 1,
            patrolProgress: 0,
            shootCooldown: 2.0 + Math.random() * 1.5,
            shootTimer: 0,
            hitAnimationTimer: 0
        };

        this.renderHealthBar(bot);
        this.bots.push(bot);
        return bot;
    }

    renderHealthBar(bot) {
        const ctx = bot.hpCtx;
        const w = bot.hpCanvas.width;
        const h = bot.hpCanvas.height;

        ctx.clearRect(0, 0, w, h);

        if (!bot.isAlive) {
            bot.hpTexture.needsUpdate = true;
            return;
        }

        // Background dark bar
        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.fillRect(0, 0, w, h);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);

        // Current HP fill
        const hpRatio = Math.max(0, bot.hp / bot.maxHp);
        ctx.fillStyle = hpRatio > 0.4 ? '#e53e3e' : '#ff0033';
        ctx.fillRect(3, 3, (w - 6) * hpRatio, h - 6);

        // Segment lines every 25 HP
        const segments = bot.maxHp / 25;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        for (let i = 1; i < segments; i++) {
            const segX = 3 + (w - 6) * (i / segments);
            ctx.fillRect(segX - 1, 3, 2, h - 6);
        }

        bot.hpTexture.needsUpdate = true;
    }

    takeDamage(bot, amount, isHeadshot = false) {
        if (!bot.isAlive) return false;

        bot.hp = Math.max(0, bot.hp - amount);
        this.renderHealthBar(bot);

        // Flash red/white on hit
        bot.hitAnimationTimer = 0.1;
        bot.eye.material = this.materials.omnicEyeYellow;

        if (bot.hp <= 0) {
            bot.isAlive = false;
            bot.respawnTimer = 4.0;
            bot.mesh.visible = false;
            this.renderHealthBar(bot);
            return true; // was killed
        }

        return false;
    }

    respawnBot(bot) {
        bot.hp = bot.maxHp;
        bot.isAlive = true;
        bot.mesh.position.copy(bot.spawnPos);
        bot.mesh.visible = true;
        bot.eye.material = this.materials.omnicEyeRed;
        this.renderHealthBar(bot);
    }

    checkHit(raycaster) {
        let closestHit = null;
        let minDistance = Infinity;

        for (const bot of this.bots) {
            if (!bot.isAlive) continue;

            const intersects = raycaster.intersectObjects(bot.mesh.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                if (hit.distance < minDistance) {
                    minDistance = hit.distance;

                    // Check if hit was on head/eye (headshot zone: height >= 1.35 from bot base)
                    const localY = hit.point.y - bot.mesh.position.y;
                    const isHeadshot = (localY >= 1.35);

                    closestHit = {
                        bot: bot,
                        point: hit.point,
                        normal: hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0),
                        distance: hit.distance,
                        isHeadshot: isHeadshot
                    };
                }
            }
        }

        return closestHit;
    }

    update(delta, playerPos, onBotShoot) {
        for (const bot of this.bots) {
            if (!bot.isAlive) {
                bot.respawnTimer -= delta;
                if (bot.respawnTimer <= 0) {
                    this.respawnBot(bot);
                }
                continue;
            }

            // Hit flash decay
            if (bot.hitAnimationTimer > 0) {
                bot.hitAnimationTimer -= delta;
                if (bot.hitAnimationTimer <= 0) {
                    bot.eye.material = this.materials.omnicEyeRed;
                }
            }

            // Patrol movement
            if (bot.patrolDistance > 0) {
                const speed = 3.5;
                const move = speed * delta * bot.patrolDir;
                bot.patrolProgress += move;
                bot.mesh.position.x += move;

                if (Math.abs(bot.patrolProgress) >= bot.patrolDistance) {
                    bot.patrolDir *= -1;
                }
            }

            // Flying drone hovering
            if (bot.type === 'flying') {
                bot.mesh.position.y = bot.spawnPos.y + Math.sin(Date.now() * 0.003) * 0.8;
                bot.mesh.position.z = bot.spawnPos.z + Math.cos(Date.now() * 0.002) * 1.5;
            }

            // Turn towards player if nearby
            if (playerPos) {
                const lookTarget = new THREE.Vector3(playerPos.x, bot.mesh.position.y, playerPos.z);
                bot.mesh.lookAt(lookTarget);

                // Combat bots shoot at player!
                if (bot.type === 'combat') {
                    bot.shootTimer += delta;
                    const distToPlayer = bot.mesh.position.distanceTo(playerPos);
                    if (distToPlayer < 35 && bot.shootTimer >= bot.shootCooldown) {
                        bot.shootTimer = 0;
                        if (onBotShoot) {
                            const origin = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
                            const dir = new THREE.Vector3().subVectors(playerPos, origin).normalize();
                            onBotShoot(origin, dir);
                        }
                    }
                }
            }
        }
    }
}
