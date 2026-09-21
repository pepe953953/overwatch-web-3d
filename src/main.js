import * as THREE from 'three';
import { soundEngine } from './audio.js';
import { HEROES } from './heroes.js';
import { WeaponSystem } from './weapons.js';
import { ParticleSystem } from './particles.js';
import { BotManager } from './bots.js';
import { GameMap } from './map.js';
import { PlayerPhysics } from './physics.js';
import { UIManager } from './ui.js';

class OverwatchGame {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.clock = new THREE.Clock();

        // 1. Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 2. Core Systems
        this.ui = new UIManager();
        this.physics = new PlayerPhysics(this.camera, this.canvas);
        this.map = new GameMap(this.scene);
        this.weapons = new WeaponSystem(this.camera);
        this.particles = new ParticleSystem(this.scene);
        this.bots = new BotManager(this.scene);

        // 3. Player Gameplay State
        this.currentHero = HEROES.soldier76;
        this.selectedHeroId = 'soldier76';
        this.hp = this.currentHero.maxHp;
        this.ammo = this.currentHero.weapon.ammoMax;
        this.isReloading = false;
        this.reloadTimer = 0;

        // Abilities Cooldowns & State
        this.ab1Cd = 0;
        this.ab2Cd = 0;
        this.secCd = 0;

        // Hero specific states
        this.isSprinting = false;
        this.tracerCharges = 3;
        this.tracerChargeTimer = 0;
        this.isDeflecting = false;
        this.deflectTimer = 0;
        this.isDragonblade = false;
        this.dragonbladeTimer = 0;
        this.dragonbladeSlashCd = 0;
        this.isTacticalVisor = false;
        this.tacticalVisorTimer = 0;

        // Ultimate charge
        this.ultCharge = 0; // 0 to 100%
        this.isUltReady = false;

        // Shooting input state
        this.isMouseDown = false;
        this.isRightMouseDown = false;
        this.shootTimer = 0;
        this.genjiBurstLeft = 0;
        this.genjiBurstTimer = 0;

        // Stats
        this.stats = {
            kills: 0,
            deaths: 0,
            damage: 0,
            healing: 0,
            shotsFired: 0,
            shotsHit: 0
        };

        this.isPlaying = false;
        this.raycaster = new THREE.Raycaster();

        this.initBots();
        this.setupEventListeners();
        this.setHero('soldier76');

        // Start render loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initBots() {
        // Stationary target dummies for precision practice
        this.bots.createBot('target-1', '훈련용 봇 [고정 A]', 'stationary', new THREE.Vector3(-6, 0, -18));
        this.bots.createBot('target-2', '훈련용 봇 [고정 B]', 'stationary', new THREE.Vector3(6, 0, -18));

        // Moving patrol bots on tracks
        this.bots.createBot('patrol-1', '훈련용 봇 [순찰 A]', 'patrol', new THREE.Vector3(0, 0, -22), 8);
        this.bots.createBot('patrol-2', '훈련용 봇 [순찰 B]', 'patrol', new THREE.Vector3(-18, 5, 10), 5);

        // Combat bots that fire back
        this.bots.createBot('combat-1', '전투용 옴닉 [사격 A]', 'combat', new THREE.Vector3(18, 6, -10));
        this.bots.createBot('combat-2', '전투용 옴닉 [사격 B]', 'combat', new THREE.Vector3(0, 0, -5)); // Inside point A

        // Flying drone bot
        this.bots.createBot('flying-1', '비행 드론 봇', 'flying', new THREE.Vector3(0, 8, -15));
    }

    setHero(heroId) {
        this.selectedHeroId = heroId;
        this.currentHero = HEROES[heroId];
        this.hp = this.currentHero.maxHp;
        this.ammo = this.currentHero.weapon.ammoMax;
        this.isReloading = false;
        this.reloadTimer = 0;

        // Reset ability timers
        this.ab1Cd = 0;
        this.ab2Cd = 0;
        this.secCd = 0;
        this.isSprinting = false;
        this.tracerCharges = 3;
        this.tracerChargeTimer = 0;
        this.isDeflecting = false;
        this.isDragonblade = false;
        this.isTacticalVisor = false;

        // Update systems
        this.weapons.setHero(heroId);
        this.ui.setHero(this.currentHero);
        this.ui.updateHP(this.hp, this.currentHero.maxHp);
        this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
    }

    setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Start screen & buttons
        const startBtn = document.getElementById('btn-start-game');
        startBtn.addEventListener('click', () => {
            soundEngine.init();
            soundEngine.resume();
            document.getElementById('start-screen').style.display = 'none';
            this.physics.lock();
            this.isPlaying = true;
        });

        // Hero select screen confirm
        const heroConfirmBtn = document.getElementById('btn-confirm-hero');
        heroConfirmBtn.addEventListener('click', () => {
            this.setHero(this.selectedHeroId);
            this.ui.toggleHeroSelect(false);
            this.physics.lock();
        });

        // Hero card selection on start & switch screen
        document.querySelectorAll('.hero-card').forEach(card => {
            card.addEventListener('click', () => {
                const heroId = card.dataset.hero;
                if (!heroId) return;
                this.selectedHeroId = heroId;
                document.querySelectorAll('.hero-card').forEach(c => {
                    if (c.dataset.hero === heroId) c.classList.add('selected');
                    else c.classList.remove('selected');
                });
                if (!this.isPlaying) {
                    this.setHero(heroId);
                }
            });
        });

        // Top left buttons
        document.getElementById('btn-hero-select').addEventListener('click', () => {
            this.physics.unlock();
            this.ui.toggleHeroSelect(true);
        });

        document.getElementById('btn-sound-toggle').addEventListener('click', (e) => {
            soundEngine.init();
            soundEngine.isMuted = !soundEngine.isMuted;
            e.target.textContent = soundEngine.isMuted ? '🔇 사운드 OFF' : '🔊 사운드 ON';
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.physics.position.set(0, 1.8, 30);
            this.hp = this.currentHero.maxHp;
            this.ammo = this.currentHero.weapon.ammoMax;
            this.isReloading = false;
            this.ui.updateHP(this.hp, this.currentHero.maxHp);
            for (const bot of this.bots.bots) {
                this.bots.respawnBot(bot);
            }
        });

        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            soundEngine.resume();
            const code = e.code;

            if (code === 'KeyW') this.physics.keys.forward = true;
            if (code === 'KeyS') this.physics.keys.backward = true;
            if (code === 'KeyA') this.physics.keys.left = true;
            if (code === 'KeyD') this.physics.keys.right = true;
            if (code === 'Space') {
                this.physics.keys.jump = true;
                soundEngine.playJump();
            }

            // Reload [R]
            if (code === 'KeyR' && !this.isReloading && this.ammo < this.currentHero.weapon.ammoMax) {
                this.startReload();
            }

            // Ability 1 [Shift]
            if (code === 'ShiftLeft' || code === 'ShiftRight') {
                this.triggerAbility1();
            }

            // Ability 2 [E]
            if (code === 'KeyE') {
                this.triggerAbility2();
            }

            // Ultimate [Q]
            if (code === 'KeyQ') {
                this.triggerUltimate();
            }

            // Hero Switch [H]
            if (code === 'KeyH') {
                this.physics.unlock();
                this.ui.toggleHeroSelect(true);
            }

            // Scoreboard [Tab]
            if (code === 'Tab') {
                e.preventDefault();
                this.ui.updateScoreboard(this.stats);
                this.ui.toggleScoreboard(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code;
            if (code === 'KeyW') this.physics.keys.forward = false;
            if (code === 'KeyS') this.physics.keys.backward = false;
            if (code === 'KeyA') this.physics.keys.left = false;
            if (code === 'KeyD') this.physics.keys.right = false;
            if (code === 'Space') this.physics.keys.jump = false;

            if (code === 'Tab') {
                this.ui.toggleScoreboard(false);
            }
        });

        // Mouse inputs
        window.addEventListener('mousedown', (e) => {
            soundEngine.resume();
            if (!this.physics.isLocked) return;

            if (e.button === 0) { // Left Click
                this.isMouseDown = true;
                this.onPrimaryFire();
            } else if (e.button === 2) { // Right Click
                this.isRightMouseDown = true;
                this.onSecondaryFire();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isMouseDown = false;
            if (e.button === 2) this.isRightMouseDown = false;
        });

        // Prevent context menu on right click
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startReload() {
        if (this.isReloading) return;
        this.isReloading = true;
        this.reloadTimer = this.isTacticalVisor ? this.currentHero.weapon.reloadTime * 0.5 : this.currentHero.weapon.reloadTime;
        soundEngine.playReload();
        this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, true);
    }

    // --- ABILITY 1 (Shift) ---
    triggerAbility1() {
        if (this.currentHero.id === 'soldier76') {
            // Sprint toggle
            this.isSprinting = !this.isSprinting;
        } else if (this.currentHero.id === 'tracer') {
            // Blink (uses charge)
            if (this.tracerCharges > 0) {
                this.tracerCharges--;
                this.physics.performBlink(this.currentHero.ability1.distance, this.map.colliders);
                soundEngine.playTracerBlink();
                this.particles.createHitSparks(this.physics.position, new THREE.Vector3(0, 1, 0), false);
            }
        } else if (this.currentHero.id === 'genji') {
            // Swift Strike
            if (this.ab1Cd <= 0) {
                this.ab1Cd = this.currentHero.ability1.cooldown;
                soundEngine.playGenjiSwiftStrike();

                // Dash & damage enemies in trajectory
                const startPos = this.physics.position.clone();
                this.physics.performSwiftStrike(this.currentHero.ability1.distance);
                const endPos = this.physics.position.clone();

                this.particles.createBulletTracer(startPos, endPos, 0x00ff88);

                // Hit detection along dash path
                for (const bot of this.bots.bots) {
                    if (!bot.isAlive) continue;
                    const d = bot.mesh.position.distanceTo(endPos);
                    if (d < 5.0) {
                        this.damageBot(bot, 50, false);
                    }
                }
            }
        }
    }

    // --- ABILITY 2 (E) ---
    triggerAbility2() {
        if (this.ab2Cd > 0) return;

        if (this.currentHero.id === 'soldier76') {
            // Biotic Field
            this.ab2Cd = this.currentHero.ability2.cooldown;
            soundEngine.playBioticField();
            const deployPos = this.physics.position.clone();
            deployPos.y = 0; // floor height
            this.particles.spawnBioticField(deployPos, 5.0, 5.0);
        } else if (this.currentHero.id === 'tracer') {
            // Recall (Rewind 3 seconds)
            this.ab2Cd = this.currentHero.ability2.cooldown;
            const past = this.physics.getRecallState();
            soundEngine.playTracerRecall();

            if (past) {
                this.particles.createExplosionEffect(this.physics.position, 2.0, 0x00d2ff);
                this.physics.position.copy(past.pos);
                this.hp = Math.max(this.hp, past.hp);
                this.ui.updateHP(this.hp, this.currentHero.maxHp);
            }
            // Instant reload
            this.ammo = this.currentHero.weapon.ammoMax;
            this.isReloading = false;
            this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
        } else if (this.currentHero.id === 'genji') {
            // Deflect (2 seconds)
            this.ab2Cd = this.currentHero.ability2.cooldown;
            this.isDeflecting = true;
            this.deflectTimer = 2.0;
            this.weapons.setDeflect(true);
            soundEngine.playGenjiDeflect();
        }
    }

    // --- SECONDARY FIRE (Right Click) ---
    onSecondaryFire() {
        if (this.currentHero.id === 'soldier76') {
            // Helix Rockets
            if (this.secCd <= 0) {
                this.secCd = this.currentHero.secondary.cooldown;
                soundEngine.playHelixRockets();

                const muzzle = this.weapons.models.soldier76.userData.muzzlePoint.getWorldPosition(new THREE.Vector3());
                const aimDir = this.physics.getAimDirection();

                this.particles.spawnHelixRockets(muzzle, aimDir, (hitProj) => {
                    // Explode on impact
                    soundEngine.playExplosion();
                    this.particles.createExplosionEffect(hitProj.object.position, 3.5, 0x3182ce);

                    // Splash damage
                    for (const bot of this.bots.bots) {
                        if (!bot.isAlive) continue;
                        const dist = bot.mesh.position.distanceTo(hitProj.object.position);
                        if (dist < 4.0) {
                            const dmg = (dist < 1.5) ? 120 : 60;
                            this.damageBot(bot, dmg, false);
                        }
                    }
                });
            }
        } else if (this.currentHero.id === 'tracer') {
            // Right click is also Blink for Tracer
            this.triggerAbility1();
        } else if (this.currentHero.id === 'genji') {
            // Shuriken Fan (3 spread shurikens)
            if (this.secCd <= 0 && this.ammo >= 3 && !this.isReloading) {
                this.secCd = this.currentHero.weapon.secondaryRate;
                this.ammo -= 3;
                this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
                soundEngine.playShurikenThrow();
                this.weapons.triggerShootAnimation();

                const hand = this.weapons.models.genji.userData.hand.getWorldPosition(new THREE.Vector3());
                const fwd = this.physics.getAimDirection();
                const right = this.physics.getRightVector();

                const angles = [-0.15, 0, 0.15];
                angles.forEach(ang => {
                    const dir = fwd.clone().addScaledVector(right, ang).normalize();
                    this.particles.spawnShuriken(hand, dir, (proj) => {
                        this.damageBot(proj.hitBot, 27, proj.isHeadshot);
                    });
                });
            }
        }
    }

    // --- ULTIMATE ABILITY (Q) ---
    triggerUltimate() {
        if (!this.isUltReady) return;

        this.ultCharge = 0;
        this.isUltReady = false;
        this.ui.updateUltimate(0, false);

        if (this.currentHero.id === 'soldier76') {
            // Tactical Visor
            soundEngine.playTacticalVisor();
            this.isTacticalVisor = true;
            this.tacticalVisorTimer = 6.0;
            this.ammo = this.currentHero.weapon.ammoMax;
            this.isReloading = false;
            this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
        } else if (this.currentHero.id === 'tracer') {
            // Pulse Bomb
            soundEngine.playPulseBombThrow();
            const origin = this.physics.position.clone().add(new THREE.Vector3(0, 0.4, 0));
            const dir = this.physics.getAimDirection();

            this.particles.spawnPulseBomb(origin, dir, (bombPos) => {
                soundEngine.playExplosion();
                // 350 AOE Damage
                for (const bot of this.bots.bots) {
                    if (!bot.isAlive) continue;
                    const d = bot.mesh.position.distanceTo(bombPos);
                    if (d < 4.5) {
                        this.damageBot(bot, 350, false);
                    }
                }
            });
        } else if (this.currentHero.id === 'genji') {
            // Dragonblade
            soundEngine.playDragonblade();
            this.isDragonblade = true;
            this.dragonbladeTimer = 6.0;
            this.weapons.setDragonblade(true);
        }
    }

    // --- PRIMARY FIRE (Left Click) ---
    onPrimaryFire() {
        if (this.isReloading) return;

        // Cancel sprint when firing as Soldier: 76
        if (this.isSprinting) this.isSprinting = false;

        if (this.currentHero.id === 'soldier76') {
            if (this.shootTimer <= 0 && this.ammo > 0) {
                this.shootTimer = this.currentHero.weapon.fireRate;
                this.ammo--;
                this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
                this.weapons.triggerShootAnimation();
                soundEngine.playSoldierShoot();
                this.stats.shotsFired++;

                // Tactical visor auto-aim lock: Find closest enemy in FOV
                let aimDir = this.physics.getAimDirection();
                if (this.isTacticalVisor) {
                    let bestTarget = null;
                    let bestAngle = 0.5; // ~30 deg cone
                    for (const bot of this.bots.bots) {
                        if (!bot.isAlive) continue;
                        const toBot = new THREE.Vector3().subVectors(bot.mesh.position, this.physics.position).normalize();
                        const dot = aimDir.dot(toBot);
                        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                        if (angle < bestAngle) {
                            bestAngle = angle;
                            bestTarget = bot;
                        }
                    }
                    if (bestTarget) {
                        aimDir = new THREE.Vector3().subVectors(bestTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), this.physics.position).normalize();
                    }
                } else {
                    // Spread
                    aimDir.x += (Math.random() - 0.5) * 0.02;
                    aimDir.y += (Math.random() - 0.5) * 0.02;
                    aimDir.normalize();
                }

                // Raycast hitscan
                this.raycaster.set(this.physics.position, aimDir);
                const hit = this.bots.checkHit(this.raycaster);

                const muzzle = this.weapons.models.soldier76.userData.muzzlePoint.getWorldPosition(new THREE.Vector3());
                const endPos = hit ? hit.point : this.physics.position.clone().addScaledVector(aimDir, 70);
                this.particles.createBulletTracer(muzzle, endPos, 0x63b3ed);

                if (hit) {
                    this.stats.shotsHit++;
                    this.particles.createHitSparks(hit.point, hit.normal, hit.isHeadshot);
                    const dmg = hit.isHeadshot ? 19 * 2 : 19;
                    this.damageBot(hit.bot, dmg, hit.isHeadshot);
                }

                if (this.ammo === 0) this.startReload();
            }
        } else if (this.currentHero.id === 'tracer') {
            if (this.shootTimer <= 0 && this.ammo > 0) {
                this.shootTimer = this.currentHero.weapon.fireRate;
                const bullets = Math.min(2, this.ammo);
                this.ammo -= bullets;
                this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
                this.weapons.triggerShootAnimation(this.ammo % 4 === 0);
                soundEngine.playTracerShoot();
                this.stats.shotsFired += 2;

                // Fire 2 rapid hitscan pellets
                for (let i = 0; i < bullets; i++) {
                    const aimDir = this.physics.getAimDirection();
                    aimDir.x += (Math.random() - 0.5) * 0.04;
                    aimDir.y += (Math.random() - 0.5) * 0.04;
                    aimDir.normalize();

                    this.raycaster.set(this.physics.position, aimDir);
                    const hit = this.bots.checkHit(this.raycaster);
                    const muzzle = (i === 0) ? this.weapons.models.tracer.userData.left.userData.muzzle.getWorldPosition(new THREE.Vector3()) : this.weapons.models.tracer.userData.right.userData.muzzle.getWorldPosition(new THREE.Vector3());
                    const endPos = hit ? hit.point : this.physics.position.clone().addScaledVector(aimDir, 40);
                    this.particles.createBulletTracer(muzzle, endPos, 0xed8936);

                    if (hit) {
                        this.stats.shotsHit++;
                        this.particles.createHitSparks(hit.point, hit.normal, hit.isHeadshot);
                        const dmg = hit.isHeadshot ? 6 * 2 : 6;
                        this.damageBot(hit.bot, dmg, hit.isHeadshot);
                    }
                }

                if (this.ammo === 0) this.startReload();
            }
        } else if (this.currentHero.id === 'genji') {
            if (this.isDragonblade) {
                // Dragonblade Melee Slash (110 damage)
                if (this.dragonbladeSlashCd <= 0) {
                    this.dragonbladeSlashCd = 0.75;
                    this.weapons.triggerSwordSlash();
                    soundEngine.playDragonbladeSwing();

                    const aimDir = this.physics.getAimDirection();
                    this.particles.spawnSlashWave(this.physics.position.clone().add(aimDir.clone().multiplyScalar(1.2)), aimDir, (wave) => {
                        this.damageBot(wave.hitBot, 110, false);
                    });

                    // Check close range melee hits
                    for (const bot of this.bots.bots) {
                        if (!bot.isAlive) continue;
                        const dist = bot.mesh.position.distanceTo(this.physics.position);
                        if (dist < 5.5) {
                            const toBot = new THREE.Vector3().subVectors(bot.mesh.position, this.physics.position).normalize();
                            if (aimDir.dot(toBot) > 0.4) {
                                this.damageBot(bot, 110, false);
                            }
                        }
                    }
                }
            } else {
                // Shuriken 3-burst
                if (this.shootTimer <= 0 && this.ammo >= 3) {
                    this.shootTimer = this.currentHero.weapon.fireRate;
                    this.genjiBurstLeft = 3;
                    this.genjiBurstTimer = 0;
                }
            }
        }
    }

    damageBot(bot, amount, isHeadshot = false) {
        if (!bot.isAlive) return;

        this.stats.damage += amount;
        this.addUltCharge(amount * 0.4);
        soundEngine.playHitSound(isHeadshot);
        this.ui.showHitmarker(isHeadshot);
        this.particles.createDamageNumber(bot.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)), amount, isHeadshot);

        const killed = this.bots.takeDamage(bot, amount, isHeadshot);
        if (killed) {
            this.stats.kills++;
            soundEngine.playEliminationSound();
            this.ui.showElimination(bot.name);

            // Genji passive: Swift Strike cooldown resets on elimination!
            if (this.currentHero.id === 'genji') {
                this.ab1Cd = 0;
            }
        }
    }

    addUltCharge(amount) {
        if (this.isUltReady) return;
        this.ultCharge = Math.min(100, this.ultCharge + amount);
        if (this.ultCharge >= 100) {
            this.ultCharge = 100;
            this.isUltReady = true;
            soundEngine.playUltReady();
        }
        this.ui.updateUltimate(this.ultCharge, this.isUltReady);
    }

    takeDamage(amount) {
        if (this.hp <= 0) return;

        this.hp = Math.max(0, this.hp - amount);
        this.ui.updateHP(this.hp, this.currentHero.maxHp);
        this.ui.showDamageFlash();

        if (this.hp <= 0) {
            // Player death
            this.stats.deaths++;
            this.hp = this.currentHero.maxHp;
            this.physics.position.set(0, 1.8, 30);
            this.ui.updateHP(this.hp, this.currentHero.maxHp);
        }
    }

    // --- MAIN GAME LOOP ---
    animate() {
        requestAnimationFrame(this.animate);

        const delta = Math.min(0.1, this.clock.getDelta());

        if (this.isPlaying) {
            // 1. Automatic shooting while mouse is held
            if (this.isMouseDown) {
                this.onPrimaryFire();
            }

            // Genji shuriken 3-burst handling
            if (this.genjiBurstLeft > 0) {
                this.genjiBurstTimer -= delta;
                if (this.genjiBurstTimer <= 0) {
                    this.genjiBurstTimer = 0.1;
                    this.genjiBurstLeft--;
                    this.ammo--;
                    this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
                    soundEngine.playShurikenThrow();
                    this.weapons.triggerShootAnimation();

                    const hand = this.weapons.models.genji.userData.hand.getWorldPosition(new THREE.Vector3());
                    const dir = this.physics.getAimDirection();
                    this.particles.spawnShuriken(hand, dir, (proj) => {
                        this.damageBot(proj.hitBot, 27, proj.isHeadshot);
                    });

                    if (this.ammo === 0) this.startReload();
                }
            }

            // 2. Timers and Cooldowns
            if (this.shootTimer > 0) this.shootTimer -= delta;
            if (this.ab1Cd > 0) this.ab1Cd = Math.max(0, this.ab1Cd - delta);
            if (this.ab2Cd > 0) this.ab2Cd = Math.max(0, this.ab2Cd - delta);
            if (this.secCd > 0) this.secCd = Math.max(0, this.secCd - delta);

            // Tracer Blink recharge
            if (this.currentHero.id === 'tracer') {
                if (this.tracerCharges < 3) {
                    this.tracerChargeTimer += delta;
                    if (this.tracerChargeTimer >= 3.0) {
                        this.tracerChargeTimer = 0;
                        this.tracerCharges++;
                    }
                } else {
                    this.tracerChargeTimer = 0;
                }
                this.physics.recordHistory(this.hp);
            }

            // Reload timer
            if (this.isReloading) {
                this.reloadTimer -= delta;
                if (this.reloadTimer <= 0) {
                    this.isReloading = false;
                    this.ammo = this.currentHero.weapon.ammoMax;
                    this.ui.updateAmmo(this.ammo, this.currentHero.weapon.ammoMax, false);
                }
            }

            // Genji Deflect timer
            if (this.isDeflecting) {
                this.deflectTimer -= delta;
                if (this.deflectTimer <= 0) {
                    this.isDeflecting = false;
                    this.weapons.setDeflect(false);
                }
            }

            // Genji Dragonblade timer
            if (this.isDragonblade) {
                this.dragonbladeTimer -= delta;
                if (this.dragonbladeSlashCd > 0) this.dragonbladeSlashCd -= delta;
                if (this.dragonbladeTimer <= 0) {
                    this.isDragonblade = false;
                    this.weapons.setDragonblade(false);
                }
            }

            // Soldier: 76 Tactical Visor timer
            if (this.isTacticalVisor) {
                this.tacticalVisorTimer -= delta;
                if (this.tacticalVisorTimer <= 0) {
                    this.isTacticalVisor = false;
                }
            }

            // Passive ult charge trickle
            this.addUltCharge(delta * 0.8);

            // Update UI cooldowns
            this.ui.updateCooldowns(
                this.currentHero.id,
                this.ab1Cd,
                this.ab2Cd,
                this.secCd,
                this.tracerCharges,
                this.tracerChargeTimer / 3.0
            );

            // 3. Player Movement & Physics
            const isMoving = this.physics.keys.forward || this.physics.keys.backward || this.physics.keys.left || this.physics.keys.right;
            this.physics.update(
                delta,
                this.currentHero.speed,
                this.isSprinting,
                this.currentHero.doubleJump || false,
                this.map.colliders
            );

            // 4. Weapon Viewmodel Animation
            this.weapons.update(
                delta,
                isMoving,
                this.isSprinting,
                this.physics.lookDeltaX,
                this.physics.lookDeltaY
            );

            // 5. Map Elements (Health packs, Jump pads, Objective)
            this.map.update(
                delta,
                this.physics.position,
                (healAmount, type) => {
                    // Health Pack pickup
                    if (this.hp < this.currentHero.maxHp) {
                        this.hp = Math.min(this.currentHero.maxHp, this.hp + healAmount);
                        this.stats.healing += healAmount;
                        soundEngine.playHealthPack();
                        this.ui.updateHP(this.hp, this.currentHero.maxHp);
                    }
                },
                (jumpForce) => {
                    // Jump Pad launch
                    this.physics.velocity.y = jumpForce;
                    this.physics.isGrounded = false;
                    soundEngine.playJumpPad();
                }
            );

            // Objective UI
            if (this.map.capturePoint) {
                const cp = this.map.capturePoint;
                this.ui.updateObjective(cp.progress, cp.isCaptured, cp.isPlayerInside);
                if (cp.isPlayerInside && !cp.isCaptured && Math.random() < 0.05) {
                    soundEngine.playObjectiveCapture();
                }
            }

            // 6. Biotic Field Healing Area
            for (const field of this.particles.deployables) {
                const d = field.position.distanceTo(this.physics.position);
                if (d <= field.radius) {
                    if (this.hp < this.currentHero.maxHp) {
                        const heal = 40 * delta;
                        this.hp = Math.min(this.currentHero.maxHp, this.hp + heal);
                        this.stats.healing += heal;
                        this.ui.updateHP(this.hp, this.currentHero.maxHp);
                    }
                }
            }

            // 7. Bots Update & Combat
            this.bots.update(delta, this.physics.position, (botShootPos, dir) => {
                // Combat bot shoots laser bullet at player
                soundEngine.playEnemyShoot();
                this.particles.spawnEnemyBullet(botShootPos, dir);
            });

            // 8. Projectiles collision & Deflect mechanics
            this.particles.update(delta, (proj) => {
                // Projectile hits bot
                if (proj.type === 'shuriken' || proj.type === 'slash_wave') {
                    for (const bot of this.bots.bots) {
                        if (!bot.isAlive) continue;
                        const dist = bot.mesh.position.distanceTo(proj.object.position);
                        if (dist < 1.4) {
                            proj.hitBot = bot;
                            proj.isHeadshot = (proj.object.position.y - bot.mesh.position.y >= 1.35);
                            if (proj.onHit) proj.onHit(proj);
                            return true;
                        }
                    }
                }

                // Enemy bullet hits player or is deflected
                if (proj.type === 'enemy_laser') {
                    const distToPlayer = proj.object.position.distanceTo(this.physics.position);
                    if (distToPlayer < 1.3) {
                        if (this.isDeflecting) {
                            // GENJI DEFLECT!
                            soundEngine.playGenjiDeflect();
                            proj.type = 'deflected_bullet';
                            proj.direction = this.physics.getAimDirection();
                            proj.speed = 50;
                            proj.distanceTraveled = 0;
                            proj.object.material.color.setHex(0x00ff88);
                            return false; // don't destroy, bounced!
                        } else {
                            // Take damage
                            this.takeDamage(25);
                            return true;
                        }
                    }
                }

                // Deflected bullet hits bot
                if (proj.type === 'deflected_bullet') {
                    for (const bot of this.bots.bots) {
                        if (!bot.isAlive) continue;
                        const dist = bot.mesh.position.distanceTo(proj.object.position);
                        if (dist < 1.4) {
                            this.damageBot(bot, 50, false);
                            return true;
                        }
                    }
                }

                return false;
            });

            this.ui.update(delta);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate game on window load
window.addEventListener('DOMContentLoaded', () => {
    new OverwatchGame();
});
