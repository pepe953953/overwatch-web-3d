// Overwatch 2 HUD and UI Controller

export class UIManager {
    constructor() {
        this.dom = {
            // Screens
            startScreen: document.getElementById('start-screen'),
            heroSelectScreen: document.getElementById('hero-select-screen'),
            scoreboard: document.getElementById('scoreboard'),
            hud: document.getElementById('hud'),
            damageVignette: document.getElementById('damage-vignette'),

            // Reticle & Hitmarkers
            crosshair: document.getElementById('crosshair'),
            hitmarker: document.getElementById('hitmarker'),

            // Health & Hero info
            heroPortrait: document.getElementById('hero-portrait'),
            heroName: document.getElementById('hero-name'),
            hpText: document.getElementById('hp-text'),
            hpBarFill: document.getElementById('hp-bar-fill'),

            // Ammo
            ammoCurrent: document.getElementById('ammo-current'),
            ammoMax: document.getElementById('ammo-max'),
            reloadPrompt: document.getElementById('reload-prompt'),

            // Abilities
            abilityShift: document.getElementById('ability-shift'),
            abilityShiftCd: document.getElementById('ability-shift-cd'),
            abilityE: document.getElementById('ability-e'),
            abilityECd: document.getElementById('ability-e-cd'),
            abilityRclick: document.getElementById('ability-rclick'),
            abilityRclickCd: document.getElementById('ability-rclick-cd'),
            tracerBlinks: document.getElementById('tracer-blinks'),

            // Ultimate
            ultPercent: document.getElementById('ult-percent'),
            ultRing: document.getElementById('ult-ring-progress'),
            ultPrompt: document.getElementById('ult-prompt'),
            ultContainer: document.getElementById('ult-container'),

            // Elimination Banner & Killfeed
            elimBanner: document.getElementById('elim-banner'),
            elimName: document.getElementById('elim-name'),
            killFeed: document.getElementById('kill-feed'),

            // Objective
            objProgress: document.getElementById('obj-progress'),
            objFill: document.getElementById('obj-fill'),
            objText: document.getElementById('obj-text'),

            // Scoreboard stats
            statKills: document.getElementById('stat-kills'),
            statDeaths: document.getElementById('stat-deaths'),
            statDamage: document.getElementById('stat-damage'),
            statHealing: document.getElementById('stat-healing'),
            statAccuracy: document.getElementById('stat-accuracy')
        };

        this.hitmarkerTimer = 0;
        this.elimTimer = 0;
        this.damageVignetteTimer = 0;
    }

    setHero(hero) {
        this.dom.heroName.textContent = hero.name;
        this.dom.ammoMax.textContent = `/ ${hero.weapon.ammoMax}`;
        this.dom.heroPortrait.style.borderColor = hero.accentColor;

        // Custom portrait graphics / icon
        if (hero.id === 'soldier76') {
            this.dom.heroPortrait.innerHTML = '🪖';
        } else if (hero.id === 'tracer') {
            this.dom.heroPortrait.innerHTML = '⚡';
        } else if (hero.id === 'genji') {
            this.dom.heroPortrait.innerHTML = '🥷';
        }

        // Crosshair shape
        this.dom.crosshair.className = `crosshair crosshair-${hero.id}`;

        // Show/hide Tracer blinks vs normal Shift ability
        if (hero.id === 'tracer') {
            this.dom.tracerBlinks.style.display = 'flex';
            this.dom.abilityShift.style.display = 'none';
        } else {
            this.dom.tracerBlinks.style.display = 'none';
            this.dom.abilityShift.style.display = 'flex';
            this.dom.abilityShift.querySelector('.ability-icon').textContent = hero.ability1.icon;
            this.dom.abilityShift.querySelector('.ability-key').textContent = hero.ability1.key;
        }

        // Ability E
        this.dom.abilityE.querySelector('.ability-icon').textContent = hero.ability2.icon;
        this.dom.abilityE.querySelector('.ability-key').textContent = hero.ability2.key;

        // Secondary fire
        if (hero.secondary) {
            this.dom.abilityRclick.style.display = 'flex';
            this.dom.abilityRclick.querySelector('.ability-icon').textContent = hero.secondary.icon;
        } else {
            this.dom.abilityRclick.style.display = 'none';
        }
    }

    updateHP(current, max) {
        this.dom.hpText.textContent = Math.round(current);
        const ratio = Math.max(0, Math.min(1, current / max));
        this.dom.hpBarFill.style.width = `${ratio * 100}%`;

        // Low HP danger coloring
        if (ratio < 0.3) {
            this.dom.hpBarFill.style.backgroundColor = '#e53e3e';
            this.dom.damageVignette.style.opacity = '0.5';
        } else {
            this.dom.hpBarFill.style.backgroundColor = '#ffffff';
            this.dom.damageVignette.style.opacity = '0';
        }
    }

    updateAmmo(current, max, isReloading) {
        this.dom.ammoCurrent.textContent = isReloading ? '—' : current;
        this.dom.reloadPrompt.style.display = (!isReloading && current === 0) ? 'block' : 'none';
    }

    updateCooldowns(heroId, ab1Cd, ab2Cd, secCd, tracerCharges = 3, tracerChargeProgress = 0) {
        // Ability 1 (Shift)
        if (heroId === 'tracer') {
            const dots = this.dom.tracerBlinks.querySelectorAll('.blink-pip');
            dots.forEach((dot, idx) => {
                if (idx < tracerCharges) {
                    dot.classList.add('ready');
                    dot.style.opacity = '1.0';
                } else if (idx === tracerCharges) {
                    dot.classList.remove('ready');
                    dot.style.opacity = (0.3 + tracerChargeProgress * 0.7).toString();
                } else {
                    dot.classList.remove('ready');
                    dot.style.opacity = '0.2';
                }
            });
        } else {
            if (ab1Cd > 0) {
                this.dom.abilityShiftCd.textContent = ab1Cd.toFixed(1);
                this.dom.abilityShift.classList.add('on-cooldown');
            } else {
                this.dom.abilityShiftCd.textContent = '';
                this.dom.abilityShift.classList.remove('on-cooldown');
            }
        }

        // Ability 2 (E)
        if (ab2Cd > 0) {
            this.dom.abilityECd.textContent = ab2Cd.toFixed(1);
            this.dom.abilityE.classList.add('on-cooldown');
        } else {
            this.dom.abilityECd.textContent = '';
            this.dom.abilityE.classList.remove('on-cooldown');
        }

        // Secondary (Right Click)
        if (secCd > 0) {
            this.dom.abilityRclickCd.textContent = secCd.toFixed(1);
            this.dom.abilityRclick.classList.add('on-cooldown');
        } else {
            this.dom.abilityRclickCd.textContent = '';
            this.dom.abilityRclick.classList.remove('on-cooldown');
        }
    }

    updateUltimate(charge, isReady) {
        const pct = Math.floor(Math.min(100, charge));
        this.dom.ultPercent.textContent = isReady ? '준비 완료' : `${pct}%`;

        // SVG circle dashoffset (circumference = 2 * PI * 40 ~= 251.3)
        const circumference = 251.3;
        const offset = circumference - (pct / 100) * circumference;
        this.dom.ultRing.style.strokeDashoffset = offset;

        if (isReady) {
            this.dom.ultContainer.classList.add('ult-ready');
            this.dom.ultPrompt.style.display = 'block';
        } else {
            this.dom.ultContainer.classList.remove('ult-ready');
            this.dom.ultPrompt.style.display = 'none';
        }
    }

    showHitmarker(isCritical = false) {
        this.dom.hitmarker.className = `hitmarker active ${isCritical ? 'critical' : 'normal'}`;
        this.hitmarkerTimer = 0.12;
    }

    showElimination(enemyName = '적 훈련용 봇') {
        this.dom.elimName.textContent = enemyName;
        this.dom.elimBanner.classList.add('active');
        this.elimTimer = 2.0;

        // Add to kill feed
        const item = document.createElement('div');
        item.className = 'killfeed-item';
        item.innerHTML = `<span class="player-kill">플레이어</span> <span class="kill-icon">⚔️</span> <span class="enemy-killed">${enemyName}</span>`;
        this.dom.killFeed.prepend(item);

        setTimeout(() => {
            if (item.parentNode) item.parentNode.removeChild(item);
        }, 5000);
    }

    updateObjective(progress, isCaptured, isPlayerInside) {
        const pct = Math.floor(progress);
        this.dom.objProgress.textContent = `${pct}%`;
        this.dom.objFill.style.width = `${pct}%`;

        if (isCaptured) {
            this.dom.objText.textContent = '거점 점령 완료!';
            this.dom.objText.style.color = '#00ff88';
        } else if (isPlayerInside) {
            this.dom.objText.textContent = '거점 점령 중...';
            this.dom.objText.style.color = '#00d2ff';
        } else {
            this.dom.objText.textContent = '거점 A로 이동하여 점령하세요';
            this.dom.objText.style.color = '#ffffff';
        }
    }

    showDamageFlash() {
        this.dom.damageVignette.style.opacity = '0.7';
        this.damageVignetteTimer = 0.25;
    }

    updateScoreboard(stats) {
        this.dom.statKills.textContent = stats.kills;
        this.dom.statDeaths.textContent = stats.deaths;
        this.dom.statDamage.textContent = Math.round(stats.damage);
        this.dom.statHealing.textContent = Math.round(stats.healing);
        const acc = stats.shotsFired > 0 ? ((stats.shotsHit / stats.shotsFired) * 100).toFixed(1) : '0.0';
        this.dom.statAccuracy.textContent = `${acc}%`;
    }

    toggleScoreboard(show) {
        this.dom.scoreboard.style.display = show ? 'flex' : 'none';
    }

    toggleHeroSelect(show) {
        this.dom.heroSelectScreen.style.display = show ? 'flex' : 'none';
    }

    update(delta) {
        if (this.hitmarkerTimer > 0) {
            this.hitmarkerTimer -= delta;
            if (this.hitmarkerTimer <= 0) {
                this.dom.hitmarker.className = 'hitmarker';
            }
        }

        if (this.elimTimer > 0) {
            this.elimTimer -= delta;
            if (this.elimTimer <= 0) {
                this.dom.elimBanner.classList.remove('active');
            }
        }

        if (this.damageVignetteTimer > 0) {
            this.damageVignetteTimer -= delta;
            if (this.damageVignetteTimer <= 0) {
                this.dom.damageVignette.style.opacity = '0';
            }
        }
    }
}
