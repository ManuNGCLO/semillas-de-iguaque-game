/**
 * game.js - Logica principal del juego
 * Semillas de Iguaque: Run del Altiplano
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Estados: MENU, PLAYING, PAUSED, GAMEOVER, CARDS, SETTINGS, CHARACTERS, LEADERBOARD, CREDITS
        this.state = 'MENU';
        this.prevState = 'MENU';

        // Variables del juego
        this.score = 0;
        this.distance = 0;
        this.seeds = 0;
        this.speed = 300;
        this.baseSpeed = 300;
        this.maxSpeed = 600;
        this.zone = ZONES[0];
        this.lastZoneIndex = 0;
        this.dt = 0;
        this.time = 0;

        // ─── MEJORA 1: Tutorial interactivo ───
        this.showTutorial = false;
        this.tutorialStep = 0;
        this.tutorialTimer = 0;
        this.tutorialSeen = localStorage.getItem('tutorialSeen') === 'true';

        // ─── MEJORA 2: Sistema de combo ───
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.COMBO_TIMEOUT = 2.0; // segundos entre semillas para mantener combo

        // Tarjeta desbloqueada
        this.lastUnlockedCard = null;
        this.cardUnlockDistance = 0;

        // Anuncios en pantalla (cambio de zona, boss superado)
        this.announceText = '';
        this.zoneAnnounceTimer = 0;

        // Estado de retorno de creditos y drag de galeria
        this.creditsFrom = 'GAMEOVER';
        this.lastDragY = null;

        // Input
        this.touchStartTime = 0;
        this.touchStartY = 0;
        this.isTouching = false;
        this.isGliding = false;

        // Sistemas
        this.player = new Player(this.width, this.height);
        this.obstacleSystem = new ObstacleSystem(this.width, this.height);
        this.powerupSystem = new PowerupSystem(this.width, this.height);
        this.bossSystem = new BossSystem(this.width, this.height);
        this.renderer = new Renderer(canvas);
        this.ui = new UI(canvas);

        // Botones del menu
        this.menuButtons = [];
        this.pauseButtons = [];
        this.gameOverButtons = [];
        this.settingsButtons = [];
        // ─── Nuevos botones ───
        this.characterButtons = [];
        this.leaderboardButtons = [];
        this.creditsButtons = [];

        // ─── FEATURE 1: Datos de personajes (via storage.js) ───
        this.loadCharacterData();

        // Cargar datos guardados
        this.loadData();

        // Bonus al sobrevivir un boss
        this.bossSystem.onSurvive = (bossType) => this.onBossSurvived(bossType);
    }

    loadData() {
        const saved = getData();
        this.highScore = saved.highScore || 0;
    }

    // ─── FEATURE 1: Personajes guardados en el save principal ───
    loadCharacterData() {
        this.ui.selectedCharacter = getSelectedCharacter();
        this.ui.unlockedCharacters = getUnlockedCharacters();
        this.ui.totalSeeds = getSeeds();
    }

    unlockCharacter(charId) {
        const character = CHARACTERS.find(c => c.id === charId);
        if (!character) return false;
        if (this.ui.unlockedCharacters.includes(charId)) return false;
        if (!spendSeeds(character.cost)) return false;

        unlockCharacter(charId);
        this.loadCharacterData();
        return true;
    }

    selectCharacter(charId) {
        if (!setSelectedCharacter(charId)) return false;
        this.ui.selectedCharacter = charId;
        return true;
    }

    getSelectedCharacterDef() {
        return CHARACTERS.find(c => c.id === this.ui.selectedCharacter) || CHARACTERS[0];
    }

    // ─── Bonus por sobrevivir un boss ───
    onBossSurvived(bossType) {
        const bonus = 20;
        this.seeds += bonus;
        addBossDefeated();
        this.announce('Sobreviviste al boss: +' + bonus + ' semillas');
        this.renderer.emitBurst(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            25, ['#FFD700', '#F4C430', '#FF4500'], 120, 1.0, 5
        );
        this.renderer.triggerFlash('#F4C430', 0.25);
    }

    // ─── Anuncio flotante en el HUD ───
    announce(text) {
        this.announceText = text;
        this.zoneAnnounceTimer = 3;
    }

    // ─── Estados del juego ───

    start() {
        try {
            this.state = 'PLAYING';
            this.score = 0;
            this.distance = 0;
            this.seeds = 0;
            this.speed = this.baseSpeed;
            this.zone = ZONES[0];
            this.lastZoneIndex = 0;
            this.lastUnlockedCard = null;
            this.cardUnlockDistance = 0;
            this.time = 0;

            // ─── MEJORA 2: Reset combo ───
            this.comboCount = 0;
            this.comboTimer = 0;
            this.comboMultiplier = 1;

            // Aplicar personaje seleccionado (habilidades reales)
            this.player.setCharacter(this.getSelectedCharacterDef());

            this.player.reset();
            this.obstacleSystem.reset();
            this.powerupSystem.reset();
            this.bossSystem.reset();

            this.announceText = '';
            this.zoneAnnounceTimer = 0;

            // ─── MEJORA 1: Verificar si mostrar tutorial ───
            if (!this.tutorialSeen) {
                this.showTutorial = true;
                this.tutorialStep = 0;
                this.tutorialTimer = 0;
                this.speed = 150; // Velocidad lenta durante tutorial
            } else {
                this.showTutorial = false;
                // Generar primer chunk normal
                this.obstacleSystem.generateChunk(this.zone, 1);
            }

            audioManager.init();
            audioManager.playMusic('gameplay');
        } catch (e) {
            console.error('Error en start():', e);
        }
    }

    // ─── MEJORA 1: Avanzar paso del tutorial ───
    advanceTutorial() {
        this.tutorialStep++;
        this.tutorialTimer = 0;
        if (this.tutorialStep >= 5) {
            // Tutorial completado
            this.showTutorial = false;
            this.tutorialSeen = true;
            localStorage.setItem('tutorialSeen', 'true');
            // Restaurar velocidad normal
            this.speed = this.baseSpeed;
            // Generar primer chunk
            this.obstacleSystem.generateChunk(this.zone, 1);
        }
    }

    pause() {
        if (this.state === 'PLAYING') {
            this.prevState = this.state;
            this.state = 'PAUSED';
            audioManager.stopMusic();
        }
    }

    resume() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            audioManager.playMusic('gameplay');
        }
    }

    gameOver() {
        try {
            this.state = 'GAMEOVER';
            audioManager.stopMusic();
            audioManager.playSFX('gameover');

            // Guardar high score
            const dist = Math.floor(this.distance);
            const isNewHigh = setHighScore(dist);

            // Guardar semillas y registrar la carrera en el leaderboard
            addSeeds(this.seeds);
            addRun(this.distance, this.seeds, this.getSelectedCharacterDef().name);

            // Actualizar semillas totales del UI
            this.ui.totalSeeds = getSeeds ? getSeeds() : (this.ui.totalSeeds + this.seeds);

            // Intentar desbloquear tarjeta
            if (dist >= 100) {
                const zoneId = Math.min(Math.floor(dist / 500) % 5, 4);
                const card = tryUnlockCard(zoneId);
                if (card) {
                    this.lastUnlockedCard = card;
                }
            }

            this.highScore = getHighScore();
        } catch (e) {
            console.error('Error en gameOver():', e);
        }
    }

    reset() {
        this.state = 'MENU';
        audioManager.playMusic('menu');
        // ─── FEATURE 4: Reset animacion del menu ───
        this.ui.resetMenuAnim();
    }

    // ─── MEJORA 2: Callback cuando se recoge una semilla ───
    onSeedCollected() {
        this.seeds += this.player.seedMult || 1; // Policarpa: x2
        this.comboCount++;
        this.comboTimer = this.COMBO_TIMEOUT;

        // Multiplicador: cada 5 semillas = x1 extra
        this.comboMultiplier = 1 + Math.floor(this.comboCount / 5);

        // Puntos extra por combo
        this.score += 10 * this.comboMultiplier;

        // Efecto visual de combo milestone
        if (this.comboCount > 0 && this.comboCount % 5 === 0) {
            // Spawn particulas doradas
            if (this.renderer) {
                this.renderer.emitBurst(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    15,
                    ['#FFD700', '#FFA500', '#F4C430'],
                    80,
                    0.8,
                    4
                );
            }
        }
    }

    // ─── MEJORA 4: Balance de dificultad mejorado ───
    updateDifficulty() {
        // +15 px/s cada 100m; alcanza la velocidad maxima cerca de los 2000m
        const speedIncrease = Math.floor(this.distance / 100) * 15;
        this.speed = Math.min(this.baseSpeed + speedIncrease, this.maxSpeed);

        // Dificultad de obstaculos: mas frecuentes y complejos con la distancia
        const difficultyLevel = Math.floor(this.distance / 250);
        this.obstacleSystem.setDifficulty(difficultyLevel);
    }

    // ─── Update ───

    /**
     * Actualiza el estado del juego con manejo de errores.
     * Si ocurre un error, se loguea pero el juego no se rompe.
     */
    update(dt) {
        try {
            this.dt = Math.min(dt, 0.05); // Cap delta time
            this.time += this.dt;

            switch (this.state) {
                case 'PLAYING':
                    this.updatePlaying(this.dt);
                    break;
                case 'MENU':
                    this.updateMenu(this.dt);
                    break;
                case 'PAUSED':
                    break;
                case 'GAMEOVER':
                    break;
                case 'CARDS':
                    break;
                case 'SETTINGS':
                    break;
                // ─── Nuevos estados ───
                case 'CHARACTERS':
                    break;
                case 'LEADERBOARD':
                    break;
                case 'CREDITS':
                    this.updateCredits(this.dt);
                    break;
            }
        } catch (e) {
            console.error('Error en update():', e);
        }
    }

    updatePlaying(dt) {
        try {
            // ─── MEJORA 1: Actualizar tutorial ───
            if (this.showTutorial) {
                this.tutorialTimer += dt;
                // Avanzar automaticamente despues de 3 segundos por paso
                if (this.tutorialTimer >= 3.0) {
                    this.advanceTutorial();
                }
                // Durante el tutorial, el juego avanza a velocidad lenta
                this.distance += this.speed * dt * 0.01;

                // Actualizar solo el jugador y particulas (no obstaculos daninos)
                this.player.update(dt);
                this.renderer.updateParticles(dt);

                // Tutorial paso 2: spawnear semillas alcanzables que se acercan al jugador
                if (this.tutorialStep === 2 && this.obstacleSystem.seeds.length === 0) {
                    this.obstacleSystem.spawnSeedRow(this.width * 0.9, this.zone);
                }
                for (const seed of this.obstacleSystem.seeds) {
                    seed.x -= this.speed * dt;
                }
                this.obstacleSystem.seeds = this.obstacleSystem.seeds.filter(s => s.x > -60 && !s.collected);
                const tutSeeds = this.obstacleSystem.checkSeeds(this.player, false, dt);
                if (tutSeeds.count > 0) {
                    for (const pos of tutSeeds.positions) {
                        this.onSeedCollected();
                        this.renderer.spawnCollectParticles(pos.x, pos.y, '#F4C430');
                    }
                    audioManager.playSFX('seed');
                }

                return; // Saltar el resto del update durante tutorial
            }

            // ─── MEJORA 4: Dificultad mejorada (ritmo: ~6-12 m/s) ───
            this.distance += this.speed * dt * 0.02;
            this.updateDifficulty();

            // Multiplicador de velocidad (panela)
            if (this.powerupSystem.hasEffect('speed')) {
                this.speed *= 1.6;
            }

            // Zona actual
            const zoneIndex = Math.floor(this.distance / 500) % ZONES.length;
            if (zoneIndex !== this.lastZoneIndex) {
                this.zone = ZONES[zoneIndex];
                this.lastZoneIndex = zoneIndex;
                this.renderer.startTransition();
                this.announce(this.zone.name);
            } else {
                this.zone = ZONES[zoneIndex];
            }

            // Decay del anuncio flotante
            if (this.zoneAnnounceTimer > 0) {
                this.zoneAnnounceTimer -= dt;
            }

            // ─── MEJORA 2: Decay del combo ───
            if (this.comboTimer > 0) {
                this.comboTimer -= dt;
                if (this.comboTimer <= 0) {
                    this.comboCount = 0;
                    this.comboMultiplier = 1;
                }
            }

            // Dificultad (usada por obstaculos)
            const difficulty = 1 + Math.floor(this.distance / 200) * 0.15;

            // Aplicar efectos de power-ups al jugador ANTES de actualizarlo:
            // ruanaBoost lo lee player.update() para la gravedad de planeo, asi
            // que si se asigna despues queda un frame atrasado (efecto tardio al recogerla).
            this.player.ruanaBoost = this.powerupSystem.hasEffect('glide');

            // Actualizar sistemas
            this.player.update(dt);

            if (this.powerupSystem.hasEffect('invincible')) {
                this.player.setInvincible(true);
            } else if (!this.powerupSystem.hasEffect('invincible') && this.player.isInvincible) {
                this.player.setInvincible(false);
            }

            this.obstacleSystem.update(dt, this.speed, this.zone, difficulty);
            this.powerupSystem.update(dt, this.speed);
            this.bossSystem.update(dt);

            // Colision con obstaculos
            const collision = this.obstacleSystem.checkCollision(this.player);
            if (collision.hit) {
                // ─── MEJORA 3: Usar onHit() con invencibilidad post-golpe ───
                if (this.player.onHit()) {
                    this.renderer.shake(12, 0.4);
                    this.gameOver();
                    return;
                } else {
                    // Escudo absorbio el golpe o es invencible
                    this.renderer.shake(6, 0.2);
                    // Si el escudo se consumio, apagar el efecto para que no se re-arme
                    if (!this.player.hasShield) {
                        this.powerupSystem.consumeShieldEffect();
                    }
                    // Limpiar obstaculo que golpeo
                    this.obstacleSystem.obstacles = this.obstacleSystem.obstacles.filter(o => {
                        const oBox = { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 10 };
                        const pBox = this.player.getHitbox();
                        return !rectCollision(pBox, oBox);
                    });
                }
            }

            // Colision con semillas (con posiciones para particulas)
            const hasMagnet = this.powerupSystem.hasEffect('magnet');
            const seedResult = this.obstacleSystem.checkSeeds(this.player, hasMagnet, dt);
            if (seedResult.count > 0) {
                // ─── MEJORA 2: Combo + particulas en el punto de recoleccion ───
                for (const pos of seedResult.positions) {
                    this.onSeedCollected();
                    this.renderer.spawnCollectParticles(pos.x, pos.y, '#F4C430');
                }
                audioManager.playSFX('seed');
            }

            // Colision con power-ups
            const collectedPowerup = this.powerupSystem.checkCollision(this.player);
            if (collectedPowerup) {
                // Feedback visual: flash + particulas del color del power-up
                this.renderer.triggerFlash(collectedPowerup.color, 0.2);
                this.renderer.spawnPowerupParticles(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    collectedPowerup.id
                );
                // Aplicar efecto inmediato
                switch (collectedPowerup.effect) {
                    case 'shield':
                        this.player.activateShield();
                        break;
                    case 'invincible':
                        this.player.setInvincible(true);
                        break;
                    case 'glide':
                        // La Ruana solo reduce la caida mientras el jugador mantiene
                        // presionado en el aire; sin este aviso pasa desapercibida.
                        this.announce('La Ruana: salta y manten para planear');
                        break;
                }
            }

            // Colision con boss
            if (this.bossSystem.checkCollision(this.player)) {
                if (this.player.onHit()) {
                    this.renderer.shake(15, 0.5);
                    this.gameOver();
                    return;
                } else {
                    this.renderer.shake(8, 0.3);
                }
            }

            // Boss trigger cada 1000m
            const distMod = this.distance % 1000;
            if (distMod < 5 && this.distance > 100 && !this.bossSystem.isActive && !this.bossSystem.isWarning) {
                this.bossSystem.trigger(this.distance);
            }

            // Tarjetas cada 500m
            if (this.distance > this.cardUnlockDistance + 500) {
                this.cardUnlockDistance = Math.floor(this.distance / 500) * 500;
                const zoneId = Math.min(Math.floor(this.distance / 500) % 5, 4);
                tryUnlockCard(zoneId);
            }
        } catch (e) {
            console.error('Error en updatePlaying():', e);
        }
    }

    updateMenu(dt) {
        // El menu se actualiza en el renderer y UI
    }

    // ─── FEATURE 2: Update creditos ───
    updateCredits(dt) {
        this.ui.updateCredits(dt);
    }

    // ─── MEJORA 1: Dibujar tutorial ───
    drawTutorial(ctx, w, h) {
        const steps = [
            { text: 'Toca para saltar', sub: 'Toca la pantalla' },
            { text: 'Manten para planear', sub: 'Con la ruana' },
            { text: 'Recoge semillas', sub: '\u00a1Son cultura de Boyaca!' },
            { text: 'Esquiva obstaculos', sub: 'Frailejones y rocas' },
            { text: '\u00a1A correr!', sub: 'Semillas de Iguaque' }
        ];
        const step = steps[this.tutorialStep] || steps[0];

        // Panel semi-transparente
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, h * 0.7, w, h * 0.3);

        // Texto
        drawText(ctx, step.text, w / 2, h * 0.78, 24, '#f0e6d2', 'center');
        drawText(ctx, step.sub, w / 2, h * 0.84, 16, '#aaa', 'center');

        // Indicador de progreso (dots)
        for (let i = 0; i < steps.length; i++) {
            ctx.fillStyle = i === this.tutorialStep ? '#D4853C' : '#555';
            ctx.beginPath();
            ctx.arc(w / 2 - (steps.length - 1) * 15 + i * 30, h * 0.92, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Flecha animada
        const arrowY = h * 0.65 + Math.sin(Date.now() / 300) * 10;
        ctx.fillStyle = '#D4853C';
        ctx.beginPath();
        if (this.tutorialStep === 0) {
            // Flecha arriba
            ctx.moveTo(w / 2, arrowY - 20);
            ctx.lineTo(w / 2 - 15, arrowY);
            ctx.lineTo(w / 2 + 15, arrowY);
        } else if (this.tutorialStep === 1) {
            // Mano (circulo)
            ctx.arc(w / 2, arrowY, 12, 0, Math.PI * 2);
        } else if (this.tutorialStep === 2) {
            // Flecha apuntando a semilla
            ctx.moveTo(w / 2, arrowY + 15);
            ctx.lineTo(w / 2 - 15, arrowY - 5);
            ctx.lineTo(w / 2 + 15, arrowY - 5);
        } else if (this.tutorialStep === 3) {
            // X de advertencia
            ctx.moveTo(w / 2 - 10, arrowY - 10);
            ctx.lineTo(w / 2 + 10, arrowY + 10);
            ctx.moveTo(w / 2 + 10, arrowY - 10);
            ctx.lineTo(w / 2 - 10, arrowY + 10);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#D4853C';
            ctx.stroke();
            return; // Ya dibujamos
        } else {
            // Estrella para el paso final
            const spikes = 5;
            const outerRadius = 15;
            const innerRadius = 7;
            let rot = Math.PI / 2 * 3;
            const step_angle = Math.PI / spikes;
            ctx.moveTo(w / 2, arrowY - outerRadius);
            for (let i = 0; i < spikes; i++) {
                ctx.lineTo(w / 2 + Math.cos(rot) * outerRadius, arrowY + Math.sin(rot) * outerRadius);
                rot += step_angle;
                ctx.lineTo(w / 2 + Math.cos(rot) * innerRadius, arrowY + Math.sin(rot) * innerRadius);
                rot += step_angle;
            }
            ctx.lineTo(w / 2, arrowY - outerRadius);
        }
        ctx.fill();
    }

    // ─── Helper: verificar click en boton ───
    isButtonClicked(x, y, bx, by, bw, bh) {
        return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    }

    // ─── Render ───

    /**
     * Renderiza el estado actual del juego con manejo de errores.
     * Si ocurre un error critico, dibuja una pantalla de error en lugar de dejar la pantalla en blanco.
     */
    render() {
        try {
            const w = this.canvas.width;
            const h = this.canvas.height;

            switch (this.state) {
                case 'PLAYING':
                    this.renderer.render(this);
                    // ─── MEJORA 1: Dibujar tutorial encima ───
                    if (this.showTutorial) {
                        this.drawTutorial(this.ctx, w, h);
                    }
                    // ─── MEJORA 2: Dibujar combo en HUD ───
                    if (this.comboCount > 1) {
                        const comboAlpha = Math.min(1, this.comboTimer);
                        this.ctx.save();
                        this.ctx.globalAlpha = comboAlpha;
                        const comboScale = 1 + Math.sin(this.time * 10) * 0.1;
                        this.ctx.font = `bold ${Math.floor(22 * comboScale)}px Georgia, serif`;
                        this.ctx.fillStyle = '#F4C430';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(`${this.comboCount}x COMBO`, w / 2, 90);
                        if (this.comboMultiplier > 1) {
                            this.ctx.font = `bold 13px Georgia, serif`;
                            this.ctx.fillStyle = '#FFD700';
                            this.ctx.fillText(`x${this.comboMultiplier}`, w / 2, 110);
                        }
                        this.ctx.restore();
                    }
                    break;

                case 'PAUSED':
                    // Dibujar el juego congelado detras
                    this.renderer.render(this);
                    this.pauseButtons = this.ui.drawPause(this.ctx, w, h);
                    for (const btn of this.pauseButtons) {
                        this.ui.drawButton(this.ctx, btn);
                    }
                    break;

                case 'GAMEOVER':
                    // Fondo del juego
                    this.renderer.clear();
                    this.renderer.drawParallax(this.zone);
                    this.renderer.drawGround(this.zone);
                    this.renderer.drawParticles();
                    this.gameOverButtons = this.ui.drawGameOver(this.ctx, w, h, this);
                    for (const btn of this.gameOverButtons) {
                        this.ui.drawButton(this.ctx, btn);
                    }
                    break;

                case 'MENU':
                    this.renderer.clear();
                    this.menuButtons = this.ui.drawMenu(this.ctx, w, h, this.dt);
                    for (const btn of this.menuButtons) {
                        if (!btn._visible) continue;
                        // Aplicar offset de animacion
                        if (btn._offsetX) {
                            const origX = btn.x;
                            btn.x += btn._offsetX;
                            this.ui.drawButton(this.ctx, btn);
                            btn.x = origX;
                        } else {
                            this.ui.drawButton(this.ctx, btn);
                        }
                    }
                    break;

                case 'CARDS':
                    drawCardCollection(this.ctx, w, h);
                    break;

                case 'SETTINGS':
                    this.settingsButtons = this.ui.drawSettings(this.ctx, w, h);
                    for (const btn of this.settingsButtons) {
                        this.ui.drawButton(this.ctx, btn);
                    }
                    break;

                // ─── FEATURE 1: Render de seleccion de personajes ───
                case 'CHARACTERS':
                    this.characterButtons = this.ui.drawCharacterSelect(
                        this.ctx, w, h,
                        CHARACTERS,
                        this.ui.selectedCharacter,
                        this.ui.unlockedCharacters,
                        this.ui.totalSeeds
                    );
                    for (const btn of this.characterButtons) {
                        this.ui.drawButton(this.ctx, btn);
                    }
                    break;

                // ─── FEATURE 3: Render de leaderboard ───
                case 'LEADERBOARD':
                    this.leaderboardButtons = this.ui.drawLeaderboard(
                        this.ctx, w, h,
                        this.ui.leaderboardScores
                    );
                    for (const btn of this.leaderboardButtons) {
                        this.ui.drawButton(this.ctx, btn);
                    }
                    break;

                // ─── FEATURE 2: Render de creditos ───
                case 'CREDITS':
                    this.creditsButtons = this.ui.drawCredits(this.ctx, w, h);
                    for (const btn of this.creditsButtons) {
                        this.ui.drawButton(this.ctx, btn);
                    }
                    break;
            }
        } catch (e) {
            console.error('Error en render():', e);
            // Dibujar pantalla de error como fallback para que el jugador vea algo
            this.drawErrorScreen();
        }
    }

    /**
     * Dibuja una pantalla de error cuando el renderizado principal falla.
     * Esto asegura que el jugador siempre vea algo en pantalla, incluso en caso de error.
     */
    drawErrorScreen() {
        try {
            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Titulo de error
            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 24px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Error en el juego', this.width / 2, this.height / 2 - 20);

            // Mensaje de ayuda
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '16px sans-serif';
            this.ctx.fillText('Recarga la pagina para continuar', this.width / 2, this.height / 2 + 20);

            // Reset alignment
            this.ctx.textAlign = 'start';
        } catch (fallbackError) {
            // Si incluso el fallback falla, solo loguear
            console.error('Error critico: No se pudo dibujar la pantalla de error:', fallbackError);
        }
    }

    // ─── Input handling ───

    // Rueda del mouse: scroll en la galeria de tarjetas
    handleWheel(deltaY) {
        if (this.state === 'CARDS' && typeof scrollCards === 'function') {
            scrollCards(-deltaY * 0.6);
        }
    }

    handleInput(x, y, type) {
        try {
            const w = this.canvas.width;

            switch (this.state) {
                case 'MENU':
                    this.ui.checkButtons(this.menuButtons, x, y);
                    if (type === 'click') {
                        const btn = this.ui.findClickedButton(this.menuButtons, x, y);
                        if (btn) {
                            audioManager.playSFX('click');
                            switch (btn.action) {
                                case 'play':
                                    this.start();
                                    break;
                                case 'cards':
                                    this.state = 'CARDS';
                                    break;
                                case 'settings':
                                    this.state = 'SETTINGS';
                                    break;
                                // ─── FEATURE 1 & 3: Nuevos botones ───
                                case 'characters':
                                    this.state = 'CHARACTERS';
                                    break;
                                case 'leaderboard':
                                    this.state = 'LEADERBOARD';
                                    break;
                            }
                        }
                    }
                    break;

                case 'PLAYING':
                    // ─── MEJORA 1: Input durante tutorial ───
                    if (this.showTutorial) {
                        if (type === 'touchstart' || type === 'click') {
                            // Avanzar tutorial segun el paso y la accion
                            if (this.tutorialStep === 0 && (type === 'touchstart' || type === 'click')) {
                                this.player.jump();
                                this.advanceTutorial();
                            } else if (this.tutorialStep >= 1) {
                                this.advanceTutorial();
                            }
                        } else if (type === 'hold' && this.tutorialStep === 1) {
                            this.player.glide(true);
                            this.advanceTutorial();
                        } else if (type === 'touchend') {
                            this.player.glide(false);
                        }
                        break; // No procesar input normal durante tutorial
                    }

                    if (type === 'touchstart') {
                        // Tap sobre el boton de pausa (esquina superior derecha)
                        if (x > w - 64 && y < 64) {
                            this.pause();
                            break;
                        }
                        this.touchStartTime = Date.now();
                        this.isTouching = true;
                        this.player.jump();
                    } else if (type === 'touchend') {
                        const touchDuration = Date.now() - this.touchStartTime;
                        this.isTouching = false;
                        this.player.glide(false);
                    } else if (type === 'hold') {
                        // Mantener presionado = planeo
                        if (!this.player.isGrounded) {
                            this.player.glide(true);
                        }
                    } else if (type === 'swipe_down') {
                        this.player.slide();
                    } else if (type === 'click') {
                        // Pausa - boton en esquina superior derecha
                        if (x > w - 60 && y < 60) {
                            this.pause();
                        } else {
                            this.player.jump();
                        }
                    }
                    break;

                case 'PAUSED':
                    this.ui.checkButtons(this.pauseButtons, x, y);
                    if (type === 'click') {
                        const btn = this.ui.findClickedButton(this.pauseButtons, x, y);
                        if (btn) {
                            audioManager.playSFX('click');
                            switch (btn.action) {
                                case 'resume':
                                    this.resume();
                                    break;
                                case 'menu':
                                    this.reset();
                                    break;
                            }
                        }
                    }
                    break;

                case 'GAMEOVER':
                    this.ui.checkButtons(this.gameOverButtons, x, y);
                    if (type === 'click') {
                        const btn = this.ui.findClickedButton(this.gameOverButtons, x, y);
                        if (btn) {
                            audioManager.playSFX('click');
                            switch (btn.action) {
                                case 'retry':
                                    this.start();
                                    break;
                                case 'menu':
                                    this.reset();
                                    break;
                                // ─── FEATURE 2: Boton creditos ───
                                case 'credits':
                                    this.creditsFrom = 'GAMEOVER';
                                    this.state = 'CREDITS';
                                    this.ui.resetCredits();
                                    break;
                            }
                        }
                    }
                    break;

                case 'CARDS':
                    if (type === 'touchstart') {
                        this.lastDragY = y;
                        this.dragMoved = 0;
                    } else if (type === 'drag') {
                        if (this.lastDragY !== null) {
                            const dy = y - this.lastDragY;
                            this.dragMoved = (this.dragMoved || 0) + Math.abs(dy);
                            scrollCards(dy);
                        }
                        this.lastDragY = y;
                    } else if (type === 'touchend') {
                        this.lastDragY = null;
                    } else if (type === 'click') {
                        // Ignorar el click si fue un arrastre
                        if ((this.dragMoved || 0) > 12) {
                            this.dragMoved = 0;
                            break;
                        }
                        const result = handleCardsInput(x, y, w, this.canvas.height);
                        if (result === 'back') {
                            audioManager.playSFX('click');
                            resetGallery();
                            this.state = 'MENU';
                            this.ui.resetMenuAnim();
                        } else if (result === 'open_detail' || result === 'close_detail') {
                            audioManager.playSFX('click');
                        }
                    }
                    break;

                case 'SETTINGS':
                    this.ui.checkButtons(this.settingsButtons, x, y);
                    if (type === 'click') {
                        const btn = this.ui.findClickedButton(this.settingsButtons, x, y);
                        if (btn) {
                            audioManager.playSFX('click');
                            switch (btn.action) {
                                case 'music_vol': {
                                    const s = getSettings();
                                    const newVol = s.musicVolume >= 1 ? 0 : s.musicVolume + 0.25;
                                    setSetting('musicVolume', newVol);
                                    audioManager.setMusicVolume(newVol);
                                    btn.text = 'Musica: ' + Math.round(newVol * 100) + '%';
                                    break;
                                }
                                case 'sfx_vol': {
                                    const s = getSettings();
                                    const newVol = s.sfxVolume >= 1 ? 0 : s.sfxVolume + 0.25;
                                    setSetting('sfxVolume', newVol);
                                    audioManager.setSFXVolume(newVol);
                                    btn.text = 'SFX: ' + Math.round(newVol * 100) + '%';
                                    break;
                                }
                                case 'credits':
                                    this.creditsFrom = 'SETTINGS';
                                    this.state = 'CREDITS';
                                    this.ui.resetCredits();
                                    break;
                                case 'back':
                                    this.state = 'MENU';
                                    this.ui.resetMenuAnim();
                                    break;
                            }
                        }
                    }
                    break;

                // ─── FEATURE 1: Input de seleccion de personajes ───
                case 'CHARACTERS':
                    this.ui.checkButtons(this.characterButtons, x, y);
                    if (type === 'click') {
                        // Verificar boton volver primero
                        const backBtn = this.characterButtons.find(b => b.action === 'back');
                        if (backBtn && this.isButtonClicked(x, y, backBtn.x, backBtn.y, backBtn.w, backBtn.h)) {
                            audioManager.playSFX('click');
                            this.state = 'MENU';
                            this.ui.resetMenuAnim();
                            break;
                        }

                        // Click en tarjetas de personaje (layout calculado por la UI)
                        const layout = this.ui.charLayout || { startX: 20, startY: 124, cardW: (w - 60) / 2, cardH: 160, gap: 16 };

                        CHARACTERS.forEach((char, i) => {
                            const col = i % 2;
                            const row = Math.floor(i / 2);
                            const cx = layout.startX + col * (layout.cardW + 20);
                            const cy = layout.startY + row * (layout.cardH + layout.gap);

                            if (this.isButtonClicked(x, y, cx, cy, layout.cardW, layout.cardH)) {
                                const isUnlocked = this.ui.unlockedCharacters.includes(char.id);

                                if (isUnlocked) {
                                    this.selectCharacter(char.id);
                                    audioManager.playSFX('click');
                                } else {
                                    if (this.unlockCharacter(char.id)) {
                                        this.selectCharacter(char.id);
                                        audioManager.playSFX('click');
                                    }
                                }
                            }
                        });
                    }
                    break;

                // ─── FEATURE 3: Input de leaderboard ───
                case 'LEADERBOARD':
                    this.ui.checkButtons(this.leaderboardButtons, x, y);
                    if (type === 'click') {
                        const btn = this.ui.findClickedButton(this.leaderboardButtons, x, y);
                        if (btn && btn.action === 'back') {
                            audioManager.playSFX('click');
                            this.state = 'MENU';
                            this.ui.resetMenuAnim();
                        }
                    }
                    break;

                // ─── FEATURE 2: Input de creditos ───
                case 'CREDITS':
                    this.ui.checkButtons(this.creditsButtons, x, y);
                    if (type === 'click') {
                        const btn = this.ui.findClickedButton(this.creditsButtons, x, y);
                        if (btn && btn.action === 'back') {
                            audioManager.playSFX('click');
                            this.state = this.creditsFrom || 'MENU';
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error('Error en handleInput():', e);
        }
    }

    // ─── Resize ───

    resize() {
        try {
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            this.player.resize(this.width, this.height);
            this.obstacleSystem.resize(this.width, this.height);
            this.powerupSystem.resize(this.width, this.height);
            this.bossSystem.resize(this.width, this.height);
            this.renderer.resize();
        } catch (e) {
            console.error('Error en resize():', e);
        }
    }
}
