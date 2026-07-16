/**
 * renderer.js - Motor de renderizado
 * Semillas de Iguaque: Run del Altiplano
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = new ParticleSystem();
        this.parallaxOffset = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.transitionProgress = 0;
        this.isTransitioning = false;

        // ─── Mejoras visuales ───
        this.zoneTransitionAlpha = 0;
        this.prevZoneId = -1;
        this.dustTimer = 0;
        this.speedLineSeeds = []; // Semillas para speed lines consistentes por frame
        for (let i = 0; i < 12; i++) {
            this.speedLineSeeds.push({
                y: Math.random(),
                x: Math.random(),
                len: 0.5 + Math.random() * 0.5,
                speed: 0.7 + Math.random() * 0.3
            });
        }

        // ─── MEJORA 8: Flash de pantalla al activar power-up ───
        this.flashScreen = 0;
        this.flashColor = '#FFFFFF';

        // ─── MEJORA 2: Partículas de recolección (combo) ───
        this.collectParticles = [];

        // ─── MEJORA 1: Parallax real de 3 capas con elementos ───
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.parallaxLayers = [
            { speed: 0.1, elements: [] }, // Capa 1: Lejana - colinas
            { speed: 0.3, elements: [] }, // Capa 2: Media - frailejones/árboles
            { speed: 0.6, elements: [] }  // Capa 3: Cercana - arbustos
        ];
        this.initParallaxLayers();

        // ─── MEJORA 3: Screen shake mejorado ───
        this.shakeDuration = 0;

        // ─── MEJORA 4: Transiciones fade ───
        this.fadeAlpha = 0;
        this.fadeTarget = 0;
        this.fadeDuration = 0;
        this.fadeSpeed = 0;
        this.onFadeComplete = null;

        // ─── Fondos ilustrados por zona (offscreen preescalado + crossfade) ───
        this.bgCache = {};          // zoneId -> canvas preescalado con overscan
        this.bgCacheW = 0;
        this.bgCacheH = 0;
        this.bgOverscan = 1.12;     // 12% extra de ancho para paneo parallax
        this.displayZoneId = -1;    // zona actualmente visible
        this.bgFadeFrom = -1;       // zona anterior durante crossfade
        this.bgFadeT = 1;           // 0..1 progreso del crossfade

        // ─── Viñeta (pre-renderizada) ───
        this.vignetteCanvas = null;

        // ─── Aves ambientales ───
        this.birds = [];
        this.birdSpawnTimer = random(6, 12);
    }

    // ─── Fondo ilustrado: construir canvas preescalado (cover-fit) ───
    buildBgCanvas(zoneId) {
        const img = getZoneBgImage(zoneId);
        if (!img) return null;
        const w = Math.ceil(this.canvas.width * this.bgOverscan);
        const h = this.canvas.height;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        octx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        // Oscurecer levemente la franja inferior para que el gameplay resalte
        const grad = octx.createLinearGradient(0, h * 0.55, 0, h);
        grad.addColorStop(0, 'rgba(26,26,46,0)');
        grad.addColorStop(1, 'rgba(26,26,46,0.32)');
        octx.fillStyle = grad;
        octx.fillRect(0, h * 0.55, w, h * 0.45);
        return off;
    }

    getBgCanvas(zoneId) {
        if (this.bgCacheW !== this.canvas.width || this.bgCacheH !== this.canvas.height) {
            this.bgCache = {};
            this.bgCacheW = this.canvas.width;
            this.bgCacheH = this.canvas.height;
        }
        if (!(zoneId in this.bgCache)) {
            this.bgCache[zoneId] = this.buildBgCanvas(zoneId);
        }
        return this.bgCache[zoneId];
    }

    // Paneo suave de ida y vuelta dentro del overscan
    getBgPan() {
        const maxPan = this.canvas.width * (this.bgOverscan - 1);
        if (maxPan <= 0) return 0;
        const v = (this.parallaxOffset * 0.04) % (maxPan * 2);
        return v < maxPan ? v : maxPan * 2 - v;
    }

    // ─── Viñeta ───
    buildVignette() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        const grad = octx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, 'rgba(10,10,20,0)');
        grad.addColorStop(1, 'rgba(10,10,20,0.30)');
        octx.fillStyle = grad;
        octx.fillRect(0, 0, w, h);
        return off;
    }

    drawVignette(ctx) {
        if (!this.vignetteCanvas ||
            this.vignetteCanvas.width !== this.canvas.width ||
            this.vignetteCanvas.height !== this.canvas.height) {
            this.vignetteCanvas = this.buildVignette();
        }
        ctx.drawImage(this.vignetteCanvas, 0, 0);
    }

    // ─── Aves ambientales ───
    updateBirds(dt) {
        this.birdSpawnTimer -= dt;
        if (this.birdSpawnTimer <= 0) {
            this.birdSpawnTimer = random(10, 22);
            const count = 2 + Math.floor(random(0, 3));
            const baseY = this.canvas.height * random(0.08, 0.28);
            const speed = random(70, 110);
            for (let i = 0; i < count; i++) {
                this.birds.push({
                    x: this.canvas.width + 30 + i * random(25, 45),
                    y: baseY + random(-20, 20),
                    speed: speed * random(0.9, 1.1),
                    flapPhase: random(0, Math.PI * 2),
                    size: random(4, 7)
                });
            }
        }
        for (const b of this.birds) {
            b.x -= b.speed * dt;
        }
        this.birds = this.birds.filter(b => b.x > -40);
    }

    drawBirds(ctx) {
        if (this.birds.length === 0) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(30,35,50,0.55)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const t = Date.now() / 1000;
        for (const b of this.birds) {
            const flap = Math.sin(t * 9 + b.flapPhase) * b.size * 0.5;
            ctx.beginPath();
            ctx.moveTo(b.x - b.size, b.y + flap);
            ctx.quadraticCurveTo(b.x, b.y - b.size * 0.4, b.x, b.y);
            ctx.quadraticCurveTo(b.x, b.y - b.size * 0.4, b.x + b.size, b.y + flap);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ─── MEJORA 1: Inicializar capas de parallax ───
    initParallaxLayers() {
        // Capa 1: Colinas (8 colinas suaves)
        this.parallaxLayers[0].elements = [];
        for (let i = 0; i < 8; i++) {
            this.parallaxLayers[0].elements.push({
                x: i * 200,
                width: 200 + Math.random() * 150,
                height: 80 + Math.random() * 60
            });
        }
        // Capa 2: Frailejones/árboles (15 elementos)
        this.parallaxLayers[1].elements = [];
        for (let i = 0; i < 15; i++) {
            this.parallaxLayers[1].elements.push({
                x: i * 120,
                type: Math.random() > 0.5 ? 'frailejon' : 'tree'
            });
        }
        // Capa 3: Arbustos (20 elementos)
        this.parallaxLayers[2].elements = [];
        for (let i = 0; i < 20; i++) {
            this.parallaxLayers[2].elements.push({
                x: i * 80,
                size: 10 + Math.random() * 15
            });
        }
    }

    // ─── MEJORA 1: Dibujar colina con curva bezier ───
    drawHillElement(ctx, x, w, h, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, this.canvasHeight);
        ctx.quadraticCurveTo(x + w / 2, this.canvasHeight - h, x + w, this.canvasHeight);
        ctx.fill();
    }

    // ─── MEJORA 1: Dibujar frailejón ───
    drawFrailejon(ctx, x, y) {
        // Tallo
        ctx.fillStyle = '#3d5c3d';
        ctx.fillRect(x - 3, y - 50, 6, 50);
        // Roseta
        ctx.fillStyle = '#4A6741';
        ctx.beginPath();
        ctx.ellipse(x, y - 50, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Detalle roseta
        ctx.fillStyle = '#5a7d52';
        ctx.beginPath();
        ctx.ellipse(x, y - 50, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ─── MEJORA 1: Dibujar árbol simple ───
    drawTree(ctx, x, y) {
        // Tronco
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(x - 4, y - 35, 8, 35);
        // Copa
        ctx.fillStyle = '#3d563d';
        ctx.beginPath();
        ctx.arc(x, y - 40, 18, 0, Math.PI * 2);
        ctx.fill();
        // Copa clara
        ctx.fillStyle = '#4A6741';
        ctx.beginPath();
        ctx.arc(x - 5, y - 45, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // ─── MEJORA 1: Dibujar arbusto ───
    drawBush(ctx, x, y, size) {
        ctx.fillStyle = '#4d6b44';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a7d52';
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // ─── Parallax ───

    updateParallax(dt, gameSpeed) {
        this.parallaxOffset += gameSpeed * dt;
    }

    drawParallax(zone, dt) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const zoneId = zone ? zone.id : 0;

        // ─── Crossfade entre fondos de zona ───
        if (this.displayZoneId === -1) {
            this.displayZoneId = zoneId;
        } else if (zoneId !== this.displayZoneId && this.bgFadeT >= 1) {
            this.bgFadeFrom = this.displayZoneId;
            this.displayZoneId = zoneId;
            this.bgFadeT = 0;
        }
        if (this.bgFadeT < 1) {
            this.bgFadeT = Math.min(1, this.bgFadeT + (dt || 0.016) * 0.9);
        }

        const bgCurrent = this.getBgCanvas(this.displayZoneId);
        const pan = this.getBgPan();

        if (bgCurrent) {
            // Fondo ilustrado con paneo suave
            if (this.bgFadeT < 1 && this.bgFadeFrom >= 0) {
                const bgPrev = this.getBgCanvas(this.bgFadeFrom);
                if (bgPrev) {
                    this.ctx.drawImage(bgPrev, -pan, 0);
                } else {
                    drawBackground(this.ctx, ZONES[this.bgFadeFrom], this.parallaxOffset, w, h);
                }
                this.ctx.save();
                this.ctx.globalAlpha = easeInOutCubic(this.bgFadeT);
                this.ctx.drawImage(bgCurrent, -pan, 0);
                this.ctx.restore();
            } else {
                this.ctx.drawImage(bgCurrent, -pan, 0);
            }
        } else {
            // Fallback procedural si la imagen no cargo
            drawBackground(this.ctx, zone, this.parallaxOffset, w, h);
        }

        // Aves ambientales (detras de las siluetas)
        this.updateBirds(dt || 0.016);
        this.drawBirds(this.ctx);

        // ─── Siluetas de media distancia (sensacion de velocidad) ───
        this.drawParallaxLayers(this.ctx, zone, !bgCurrent);
    }

    // ─── Capas de parallax: siluetas oscuras sobre el fondo ilustrado ───
    drawParallaxLayers(ctx, zone, includeHills) {
        const groundY = this.canvasHeight - 80;
        const silhouette = 'rgba(26,30,40,0.45)';

        // Capa 1: Colinas lejanas — solo en modo fallback (la imagen ya trae paisaje)
        if (includeHills) {
            const offset1 = this.parallaxOffset * this.parallaxLayers[0].speed;
            const hillColor = colorWithAlpha(zone ? zone.groundColor : '#4A6741', 0.3);
            for (const hill of this.parallaxLayers[0].elements) {
                const drawX = hill.x - (offset1 % (this.canvasWidth + 400));
                const wrappedX = ((drawX + this.canvasWidth + 400) % (this.canvasWidth + 400)) - 200;
                this.drawHillElement(ctx, wrappedX, hill.width, hill.height, hillColor);
            }
        }

        // Capa 2: Frailejones/árboles como siluetas (0.3x velocidad)
        ctx.save();
        ctx.globalAlpha = 0.5;
        const offset2 = this.parallaxOffset * this.parallaxLayers[1].speed;
        for (const elem of this.parallaxLayers[1].elements) {
            const drawX = elem.x - (offset2 % (this.canvasWidth + 600));
            const wrappedX = ((drawX + this.canvasWidth + 600) % (this.canvasWidth + 600)) - 300;
            if (elem.type === 'frailejon') {
                this.drawFrailejon(ctx, wrappedX, groundY - 10);
            } else {
                this.drawTree(ctx, wrappedX, groundY - 5);
            }
        }
        ctx.restore();

        // Capa 3: Arbustos cercanos (0.6x velocidad)
        const offset3 = this.parallaxOffset * this.parallaxLayers[2].speed;
        ctx.save();
        ctx.globalAlpha = 0.7;
        for (const bush of this.parallaxLayers[2].elements) {
            const drawX = bush.x - (offset3 % (this.canvasWidth + 400));
            const wrappedX = ((drawX + this.canvasWidth + 400) % (this.canvasWidth + 400)) - 200;
            this.drawBush(ctx, wrappedX, groundY + 5, bush.size);
        }
        ctx.restore();
    }

    // ─── Suelo ───

    drawGround(zone) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        return drawGround(this.ctx, zone, w, h, this.parallaxOffset);
    }

    // ─── Jugador ───

    drawPlayer(player) {
        player.draw(this.ctx);
    }

    // ─── Partículas ───

    emitParticles(x, y, count, color, speed, life, size) {
        this.particles.emit(x, y, count, color, speed, life, size);
    }

    emitBurst(x, y, count, colors, speed, life, size) {
        this.particles.emitBurst(x, y, count, colors, speed, life, size);
    }

    // ─── MEJORA 2: Partículas de recolección de semillas ───
    spawnCollectParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = random(0, Math.PI * 2);
            const spd = random(60, 120);
            this.particles.particles.push(
                new Particle(
                    x, y,
                    Math.cos(angle) * spd,
                    Math.sin(angle) * spd,
                    0.3 + Math.random() * 0.4,
                    color || '#F4C430',
                    3 + Math.random() * 4
                )
            );
        }
    }

    // ─── MEJORA 5 + 8: Partículas al activar power-up ───
    spawnPowerupParticles(x, y, type) {
        const colors = {
            ruana: '#8B2500',
            cocido: '#D4853C',
            panela: '#F4C430',
            queso: '#C9A84C',
            carranga: '#FF4500'
        };
        const pColor = colors[type] || '#FFD700';
        // Burst de partículas coloridas
        this.particles.emitBurst(x, y, 20, [pColor, '#FFFFFF', '#FFD700'], 100, 0.8, 5);
        // Partículas adicionales tipo anillo direccional
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 / 15) * i;
            const speed = 80 + Math.random() * 60;
            this.particles.particles.push(
                new Particle(
                    x, y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    0.5 + Math.random() * 0.4,
                    pColor,
                    4 + Math.random() * 4
                )
            );
        }
    }

    // ─── MEJORA 8: Activar flash de pantalla ───
    triggerFlash(color, duration) {
        this.flashScreen = duration || 0.3;
        this.flashColor = color || '#FFFFFF';
    }

    updateParticles(dt) {
        this.particles.update(dt);
    }

    drawParticles() {
        this.particles.draw(this.ctx);
    }

    // ─── Screen shake ───

    shake(intensity, duration) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
        // ─── MEJORA 3: Nuevo sistema de shake ───
        this.shakeDuration = duration;
    }

    // ─── MEJORA 3: Screen shake mejorado ───
    addScreenShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    updateShake(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }
        // ─── MEJORA 3: Decay del shake ───
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            this.shakeIntensity *= 0.9;
        }
    }

    applyShake() {
        if (this.shakeTimer > 0) {
            const intensity = this.shakeIntensity * (this.shakeTimer / 0.3);
            const dx = random(-intensity, intensity);
            const dy = random(-intensity, intensity);
            this.ctx.translate(dx, dy);
        }
    }

    // ─── Transición ───

    startTransition() {
        this.isTransitioning = true;
        this.transitionProgress = 0;
    }

    updateTransition(dt) {
        if (this.isTransitioning) {
            this.transitionProgress += dt * 0.8;
            if (this.transitionProgress >= 1) {
                this.isTransitioning = false;
                this.transitionProgress = 0;
            }
        }
    }

    drawTransitionOverlay(zone) {
        if (!this.isTransitioning) return;
        drawTransitionOverlay(
            this.ctx,
            this.transitionProgress,
            this.canvas.width,
            this.canvas.height,
            zone,
            null
        );
    }

    // ─── MEJORA 4: Transiciones fade ───

    fadeTo(alpha, duration, onComplete) {
        this.fadeTarget = alpha;
        this.fadeDuration = duration || 0.3;
        this.fadeSpeed = 1 / (this.fadeDuration * 60);
        this.onFadeComplete = onComplete || null;
    }

    updateFade(dt) {
        if (Math.abs(this.fadeAlpha - this.fadeTarget) > 0.01) {
            this.fadeAlpha += (this.fadeTarget - this.fadeAlpha) * 0.15;
        } else {
            this.fadeAlpha = this.fadeTarget;
            if (this.onFadeComplete) {
                this.onFadeComplete();
                this.onFadeComplete = null;
            }
        }
    }

    drawFade(ctx, w, h) {
        if (this.fadeAlpha > 0.01) {
            ctx.fillStyle = `rgba(26, 26, 46, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    // ─── Efectos visuales mejorados ───

    /**
     * a) Partículas de polvo al correr
     */
    emitDustParticles(player, dt) {
        if (player.isGrounded && !player.isSliding) {
            this.dustTimer += dt;
            if (this.dustTimer > 0.05) {
                this.dustTimer = 0;
                if (Math.random() < 0.4) {
                    const dustColor = '#C4956A';
                    const count = 1 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < count; i++) {
                        this.particles.emit(
                            player.x + player.width / 2 + (Math.random() - 0.5) * 20,
                            player.y + player.height - 5,
                            1,
                            dustColor,
                            30 + Math.random() * 40,
                            0.2 + Math.random() * 0.3,
                            2 + Math.random() * 4
                        );
                    }
                }
            }
        }
    }

    /**
     * b) Efecto de velocidad (speed lines)
     */
    drawSpeedLines(ctx, w, h, speed) {
        if (speed <= 500) return;
        const alpha = Math.min((speed - 500) / 500 * 0.25, 0.25);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#f0e6d2';
        ctx.lineWidth = 1;
        const time = Date.now() / 1000;
        for (let i = 0; i < this.speedLineSeeds.length; i++) {
            const seed = this.speedLineSeeds[i];
            const y = seed.y * h;
            const xOffset = (seed.x * w + time * seed.speed * 300 * seed.len) % (w + 200) - 100;
            const len = (50 + seed.len * 100) * (speed / 800);
            ctx.beginPath();
            ctx.moveTo(xOffset, y);
            ctx.lineTo(xOffset + len, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * c) Flash de transición de zona
     */
    updateZoneTransition(game) {
        const currentZoneId = game.zone ? game.zone.id : 0;
        if (currentZoneId !== this.prevZoneId) {
            this.zoneTransitionAlpha = 1;
            this.prevZoneId = currentZoneId;
        }
        this.zoneTransitionAlpha *= 0.94;
    }

    drawZoneTransitionFlash(ctx, w, h, zone) {
        if (this.zoneTransitionAlpha < 0.005) return;
        const zoneColor = zone ? zone.bgColorTop : '#87CEEB';
        ctx.save();
        ctx.globalAlpha = this.zoneTransitionAlpha * 0.35;
        ctx.fillStyle = zoneColor;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = this.zoneTransitionAlpha * 0.15;
        const radialGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        radialGrad.addColorStop(0, '#FFFFFF');
        radialGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    /**
     * d) Efecto de invencibilidad (Carranga)
     */
    drawCarrangaAura(ctx, player, powerupSystem) {
        if (!powerupSystem.activeEffect || powerupSystem.activeEffect.id !== 'carranga') return;
        ctx.save();
        const pulse = 0.3 + Math.sin(Date.now() / 80) * 0.2;
        ctx.globalAlpha = pulse;
        // Aura exterior
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2,
            player.y + player.height / 2,
            player.width * 0.9,
            0, Math.PI * 2
        );
        ctx.fill();
        // Anillo interior más brillante
        ctx.globalAlpha = pulse * 0.6;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2,
            player.y + player.height / 2,
            player.width * 0.7 + Math.sin(Date.now() / 60) * 3,
            0, Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    }

    /**
     * e) Glow del power-up
     */
    drawPowerupGlow(ctx, w, h, powerupSystem) {
        if (!powerupSystem.activeEffect) return;
        const colors = {
            ruana: '#8B2500',
            cocido: '#D4853C',
            panela: '#F4C430',
            queso: '#C9A84C',
            carranga: '#FF4500'
        };
        const glowColor = colors[powerupSystem.activeEffect.id] || '#FFFFFF';
        ctx.save();
        const alpha = 0.12 + Math.sin(Date.now() / 200) * 0.08;
        ctx.globalAlpha = alpha;
        // Gradiente desde los bordes hacia el centro
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, glowColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    // ─── MEJORA 8: Flash de pantalla al activar power-up ───
    updateFlash(dt) {
        if (this.flashScreen > 0) {
            this.flashScreen -= dt;
            if (this.flashScreen < 0) {
                this.flashScreen = 0;
            }
        }
    }

    drawFlash(ctx, w, h) {
        if (this.flashScreen <= 0) return;
        ctx.save();
        const alpha = Math.min(this.flashScreen * 2, 0.4);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    // ─── Renderizado completo ───

    render(game) {
        this.clear();
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.save();

        // MEJORA 3: Screen shake (aplicar antes de dibujar)
        this.updateShake(game.dt);
        this.applyShake();

        // 1. Fondo parallax
        this.updateParallax(game.dt, game.speed);
        this.drawParallax(game.zone, game.dt);

        // 2. Suelo
        this.drawGround(game.zone);

        // 3. Obstáculos
        game.obstacleSystem.draw(ctx, game.zone);

        // 4. Power-ups
        game.powerupSystem.draw(ctx);

        // 5. Boss
        game.bossSystem.draw(ctx, game.player);

        // ─── Efectos visuales mejorados ───

        // Partículas de polvo al correr
        this.emitDustParticles(game.player, game.dt);

        // Aura de Carranga (detrás del jugador)
        this.drawCarrangaAura(ctx, game.player, game.powerupSystem);

        // 6. Jugador
        this.drawPlayer(game.player);

        // 7. Partículas
        this.updateParticles(game.dt);
        this.drawParticles();

        // Speed lines (encima de todo, efecto de velocidad)
        this.drawSpeedLines(ctx, w, h, game.speed);

        // 8. Transición de zona (flash)
        this.updateZoneTransition(game);
        this.drawZoneTransitionFlash(ctx, w, h, game.zone);

        // Transición normal (overlay)
        this.updateTransition(game.dt);
        this.drawTransitionOverlay(game.zone);

        // MEJORA 4: Fade overlay
        this.updateFade(game.dt);
        this.drawFade(ctx, w, h);

        // MEJORA 8: Flash de pantalla al activar power-up
        this.updateFlash(game.dt);
        this.drawFlash(ctx, w, h);

        // Glow del power-up (encima de todo)
        this.drawPowerupGlow(ctx, w, h, game.powerupSystem);

        // Viñeta sutil de polish
        this.drawVignette(ctx);

        // 9. Tarjeta popup
        updateCardPopup(game.dt);
        drawCardPopup(ctx, w, h);

        // 10. HUD
        game.ui.drawHUD(ctx, game);

        ctx.restore();
    }

    // ─── Resize ───

    resize() {
        resizeCanvas(this.canvas);
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        // Re-inicializar elementos de parallax para el nuevo tamaño
        this.initParallaxLayers();
    }
}
