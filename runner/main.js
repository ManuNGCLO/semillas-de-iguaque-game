/**
 * runner/main.js - Prototipo: Semillas de Iguaque en perspectiva hacia adelante
 * (pseudo-3D en Canvas 2D, 3 carriles, estilo Subway Surfers)
 *
 * Archivo totalmente aislado del juego lateral original (../src/*.js).
 * No comparte estado ni localStorage con el juego principal a proposito,
 * para poder iterar aqui sin ningun riesgo sobre el build ya auditado.
 */
(function() {
    'use strict';

    // ─── Paleta (tema Paramo de Iguaque, unica zona de este prototipo) ───
    const PALETTE = {
        ink: '#1a1a2e',
        panel: 'rgba(20,20,34,0.82)',
        cream: '#f0e6d2',
        gold: '#F4C430',
        terracotta: '#D4853C',
        green: '#4A6741',
        greenDark: '#3d5637',
        skyTop: '#87CEEB',
        skyBottom: '#cfe8d8',
        roadA: '#7d7263',
        roadB: '#6b6355',
        laneLine: 'rgba(240,230,210,0.55)'
    };

    const STORAGE_KEY = 'iguaque_runner3d_best';

    function random(min, max) { return Math.random() * (max - min) + min; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function getBest() {
        try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0; }
        catch (e) { return 0; }
    }
    function setBest(v) {
        try { localStorage.setItem(STORAGE_KEY, String(v)); } catch (e) {}
    }

    // ─── Canvas ───
    const canvas = document.getElementById('runnerCanvas');
    const ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ─── Proyeccion pseudo-3D ───
    const CAMERA_DEPTH = 0.9;   // fuerza de la perspectiva
    const SPAWN_Z = 5.0;        // profundidad de aparicion de obstaculos/semillas
    const ROAD_EDGE = 1.6;      // borde del camino en unidades de mundo
    const LANE_X = [-1, 0, 1];  // centro de cada carril en unidades de mundo

    function scaleAt(z) {
        return CAMERA_DEPTH / (CAMERA_DEPTH + Math.max(0, z));
    }

    function project(worldX, z, horizonY, groundY, centerX, roadHalfWidthPx) {
        const s = scaleAt(z);
        return {
            x: centerX + worldX * roadHalfWidthPx * s,
            y: horizonY + (groundY - horizonY) * s,
            scale: s
        };
    }

    // ─── Estado ───
    let state = 'MENU'; // MENU | PLAYING | GAMEOVER
    let lastTime = 0;
    let roadScrollZ = 0;

    const player = {
        lane: 1,
        worldX: 0,
        isJumping: false,
        jumpT: 0,
        JUMP_DURATION: 0.5,
        runPhase: 0
    };

    let obstacles = [];
    let seeds = [];
    const BASE_SPEED = 1.7;
    const MAX_SPEED = 3.4;
    let speed = BASE_SPEED;
    let distance = 0;
    let seedsCollected = 0;
    let nextSpawnZ = 2.2;
    let best = getBest();
    let justFinishedDistance = 0;

    // ─── Input ───
    let touchStartX = 0, touchStartY = 0, touchStartTime = 0, touched = false;

    function changeLane(dir) {
        if (state !== 'PLAYING') return;
        player.lane = clamp(player.lane + dir, 0, LANE_X.length - 1);
    }

    function jump() {
        if (state !== 'PLAYING' || player.isJumping) return;
        player.isJumping = true;
        player.jumpT = 0;
    }

    function handleTap() {
        if (state === 'MENU' || state === 'GAMEOVER') startGame();
    }

    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
        touched = true;
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        if (!touched) return;
        touched = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dt = Date.now() - touchStartTime;
        const adx = Math.abs(dx), ady = Math.abs(dy);

        if (state !== 'PLAYING') {
            if (adx < 25 && ady < 25) handleTap();
            return;
        }

        if (adx > 40 && adx > ady) {
            changeLane(dx > 0 ? 1 : -1);
        } else if (dy < -40 && ady > adx) {
            jump();
        } else if (adx < 20 && ady < 20 && dt < 300) {
            jump(); // tap corto en pleno juego = salto
        }
    }, { passive: false });

    // Menu / Game Over: tocar el enlace "volver" no debe iniciar partida
    canvas.addEventListener('click', function(e) {
        if (state === 'PLAYING') return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        if (isBackLinkHit(x, y)) {
            window.location.href = '../index.html';
            return;
        }
        handleTap();
    });

    document.addEventListener('keydown', function(e) {
        if (state === 'MENU' || state === 'GAMEOVER') {
            if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleTap(); }
            return;
        }
        switch (e.code) {
            case 'ArrowLeft': case 'KeyA': e.preventDefault(); changeLane(-1); break;
            case 'ArrowRight': case 'KeyD': e.preventDefault(); changeLane(1); break;
            case 'ArrowUp': case 'KeyW': case 'Space': e.preventDefault(); jump(); break;
        }
    });

    // ─── Enlace "Volver al juego original" (zona clicable en menu/gameover) ───
    let backLinkBox = null;
    function isBackLinkHit(x, y) {
        if (!backLinkBox) return false;
        return x >= backLinkBox.x && x <= backLinkBox.x + backLinkBox.w &&
               y >= backLinkBox.y && y <= backLinkBox.y + backLinkBox.h;
    }

    // ─── Ciclo de vida ───
    function startGame() {
        state = 'PLAYING';
        player.lane = 1;
        player.worldX = 0;
        player.isJumping = false;
        player.jumpT = 0;
        obstacles = [];
        seeds = [];
        speed = BASE_SPEED;
        distance = 0;
        seedsCollected = 0;
        nextSpawnZ = 2.2;
    }

    function gameOver() {
        state = 'GAMEOVER';
        justFinishedDistance = Math.floor(distance);
        if (justFinishedDistance > best) {
            best = justFinishedDistance;
            setBest(best);
        }
    }

    // ─── Generacion: nunca bloquear los 3 carriles a la vez ───
    function spawnWave() {
        const blockCount = Math.random() < 0.65 ? 1 : 2;
        const lanes = [0, 1, 2];
        for (let i = lanes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = lanes[i]; lanes[i] = lanes[j]; lanes[j] = tmp;
        }
        const blocked = lanes.slice(0, blockCount);
        const free = lanes.slice(blockCount);

        for (const lane of blocked) {
            const type = Math.random() < 0.5 ? 'barrier' : 'rock';
            obstacles.push({ lane: lane, z: SPAWN_Z, type: type, resolved: false });
        }
        if (free.length > 0 && Math.random() < 0.8) {
            const lane = free[Math.floor(Math.random() * free.length)];
            seeds.push({ lane: lane, z: SPAWN_Z, collected: false });
        }
    }

    // ─── Update ───
    function update(dt) {
        roadScrollZ += (state === 'PLAYING' ? speed : BASE_SPEED * 0.4) * dt;

        if (state !== 'PLAYING') return;

        speed = Math.min(MAX_SPEED, BASE_SPEED + distance * 0.0025);
        distance += speed * dt * 18;

        const targetX = LANE_X[player.lane];
        player.worldX += (targetX - player.worldX) * Math.min(1, dt * 12);
        player.runPhase += dt * (6 + speed);

        if (player.isJumping) {
            player.jumpT += dt;
            if (player.jumpT >= player.JUMP_DURATION) {
                player.isJumping = false;
                player.jumpT = 0;
            }
        }

        nextSpawnZ -= speed * dt;
        if (nextSpawnZ <= 0) {
            spawnWave();
            nextSpawnZ = random(1.6, 2.6);
        }

        for (const o of obstacles) o.z -= speed * dt;
        for (const s of seeds) s.z -= speed * dt;

        for (const o of obstacles) {
            if (o.resolved) continue;
            if (o.z <= 0.12) {
                o.resolved = true;
                if (o.lane === player.lane) {
                    const progress = player.isJumping ? player.jumpT / player.JUMP_DURATION : 0;
                    const highEnough = player.isJumping && progress > 0.15 && progress < 0.85;
                    if (o.type === 'barrier' || !highEnough) {
                        gameOver();
                        return;
                    }
                }
            }
        }

        for (const s of seeds) {
            if (s.collected) continue;
            if (s.z <= 0.15 && s.z > -0.15 && s.lane === player.lane) {
                s.collected = true;
                seedsCollected++;
            }
        }

        obstacles = obstacles.filter(function(o) { return o.z > -0.5; });
        seeds = seeds.filter(function(s) { return s.z > -0.5 && !s.collected; });
    }

    // ─── Dibujo ───
    function draw() {
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const horizonY = h * 0.36;
        const groundY = h;
        const centerX = w / 2;
        const roadHalfWidthPx = w * 0.32;

        drawSky(w, h, horizonY);
        drawRoad(w, h, horizonY, groundY, centerX, roadHalfWidthPx);
        drawLaneMarkers(horizonY, groundY, centerX, roadHalfWidthPx);
        drawEntities(horizonY, groundY, centerX, roadHalfWidthPx);
        drawPlayer(horizonY, groundY, centerX, roadHalfWidthPx, w, h);
        drawHUD(w, h);

        if (state === 'MENU') drawOverlay(w, h, 'menu');
        if (state === 'GAMEOVER') drawOverlay(w, h, 'gameover');
    }

    function drawSky(w, h, horizonY) {
        const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
        grad.addColorStop(0, PALETTE.skyTop);
        grad.addColorStop(1, PALETTE.skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, horizonY);

        // Siluetas de montanas del Paramo
        ctx.fillStyle = 'rgba(74,103,65,0.35)';
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 40) {
            ctx.lineTo(x, horizonY - 20 - Math.sin(x * 0.01) * 30 - Math.sin(x * 0.004) * 20);
        }
        ctx.lineTo(w, horizonY);
        ctx.closePath();
        ctx.fill();

        // Pasto a ambos lados del camino
        ctx.fillStyle = PALETTE.green;
        ctx.fillRect(0, horizonY, w, h - horizonY);
    }

    function drawRoad(w, h, horizonY, groundY, centerX, roadHalfWidthPx) {
        const stripLen = 0.55;
        const stripCount = Math.ceil((SPAWN_Z + 1.5) / stripLen) + 2;
        const scrollMod = roadScrollZ % stripLen;

        for (let i = 0; i < stripCount; i++) {
            const zFar = SPAWN_Z + 1.5 - i * stripLen + scrollMod;
            const zNear = zFar - stripLen;
            if (zFar < 0) continue;
            const zNearC = Math.max(0, zNear);

            const pNearL = project(-ROAD_EDGE, zNearC, horizonY, groundY, centerX, roadHalfWidthPx);
            const pNearR = project(ROAD_EDGE, zNearC, horizonY, groundY, centerX, roadHalfWidthPx);
            const pFarL = project(-ROAD_EDGE, zFar, horizonY, groundY, centerX, roadHalfWidthPx);
            const pFarR = project(ROAD_EDGE, zFar, horizonY, groundY, centerX, roadHalfWidthPx);

            ctx.fillStyle = (i % 2 === 0) ? PALETTE.roadA : PALETTE.roadB;
            ctx.beginPath();
            ctx.moveTo(pNearL.x, pNearL.y);
            ctx.lineTo(pNearR.x, pNearR.y);
            ctx.lineTo(pFarR.x, pFarR.y);
            ctx.lineTo(pFarL.x, pFarL.y);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawLaneMarkers(horizonY, groundY, centerX, roadHalfWidthPx) {
        const dividers = [-0.5, 0.5];
        const dashLen = 0.35, gapLen = 0.35;
        const cycle = dashLen + gapLen;
        const scrollMod = roadScrollZ % cycle;

        for (const dx of dividers) {
            let z = SPAWN_Z + 1 + scrollMod;
            while (z > 0) {
                const zFar = z;
                const zNear = Math.max(0, z - dashLen);
                const pNear = project(dx, zNear, horizonY, groundY, centerX, roadHalfWidthPx);
                const pFar = project(dx, zFar, horizonY, groundY, centerX, roadHalfWidthPx);
                const halfW = Math.max(1, 3 * pNear.scale);

                ctx.fillStyle = PALETTE.laneLine;
                ctx.beginPath();
                ctx.moveTo(pNear.x - halfW, pNear.y);
                ctx.lineTo(pNear.x + halfW, pNear.y);
                ctx.lineTo(pFar.x + halfW * pFar.scale / pNear.scale, pFar.y);
                ctx.lineTo(pFar.x - halfW * pFar.scale / pNear.scale, pFar.y);
                ctx.closePath();
                ctx.fill();

                z -= cycle;
            }
        }
    }

    function drawEntities(horizonY, groundY, centerX, roadHalfWidthPx) {
        const all = obstacles.map(function(o) { return { ref: o, kind: 'obstacle' }; })
            .concat(seeds.filter(function(s) { return !s.collected; }).map(function(s) { return { ref: s, kind: 'seed' }; }));
        all.sort(function(a, b) { return b.ref.z - a.ref.z; }); // lejos primero

        for (const item of all) {
            const p = project(LANE_X[item.ref.lane], Math.max(0, item.ref.z), horizonY, groundY, centerX, roadHalfWidthPx);
            if (item.kind === 'obstacle') {
                drawObstacle(p, item.ref.type);
            } else {
                drawSeedSprite(p);
            }
        }
    }

    function drawObstacle(p, type) {
        ctx.save();
        if (type === 'barrier') {
            const bw = 46 * p.scale, bh = 90 * p.scale;
            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - 2, bw * 0.6, bw * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Frailejon-roca: tallo + roseta (bloquea el carril entero)
            ctx.fillStyle = PALETTE.greenDark;
            ctx.fillRect(p.x - bw * 0.12, p.y - bh, bw * 0.24, bh);
            ctx.fillStyle = PALETTE.green;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - bh, bw * 0.5, bw * 0.32, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5a7d52';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - bh * 1.02, bw * 0.32, bw * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const rw = 40 * p.scale, rh = 26 * p.scale;
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - 1, rw * 0.55, rw * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7a7a7a';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - rh * 0.5, rw * 0.5, rh * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8f8f8f';
            ctx.beginPath();
            ctx.ellipse(p.x - rw * 0.12, p.y - rh * 0.6, rw * 0.28, rh * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawSeedSprite(p) {
        const size = 9 * p.scale;
        ctx.save();
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 8 * p.scale;
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - size, size, size * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.ellipse(p.x - size * 0.2, p.y - size * 1.3, size * 0.3, size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawPlayer(horizonY, groundY, centerX, roadHalfWidthPx, w, h) {
        const p = project(player.worldX, 0, horizonY, groundY, centerX, roadHalfWidthPx);
        const jumpProgress = player.isJumping ? clamp(player.jumpT / player.JUMP_DURATION, 0, 1) : 0;
        const jumpOffset = Math.sin(jumpProgress * Math.PI) * h * 0.16;

        const baseX = p.x;
        const baseY = groundY - 6;
        const bodyW = w * 0.10;
        const bodyH = h * 0.16;

        // Sombra (se achica en el aire)
        const shadowScale = 1 - jumpOffset / (h * 0.16) * 0.5;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(baseX, baseY, bodyW * 0.55 * shadowScale, bodyW * 0.18 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const cx = baseX;
        const cy = baseY - bodyH * 0.5 - jumpOffset;

        // Piernas (alternando si esta corriendo y en el suelo)
        if (!player.isJumping) {
            const legSwing = Math.sin(player.runPhase) * bodyW * 0.16;
            ctx.fillStyle = PALETTE.ink;
            ctx.fillRect(cx - bodyW * 0.22 + legSwing, baseY - bodyH * 0.32 - jumpOffset, bodyW * 0.16, bodyH * 0.32);
            ctx.fillRect(cx + bodyW * 0.06 - legSwing, baseY - bodyH * 0.32 - jumpOffset, bodyW * 0.16, bodyH * 0.32);
        }

        // Cuerpo (ruana)
        ctx.fillStyle = PALETTE.terracotta;
        ctx.beginPath();
        ctx.moveTo(cx, cy - bodyH * 0.5);
        ctx.lineTo(cx + bodyW * 0.5, cy + bodyH * 0.2);
        ctx.lineTo(cx, cy + bodyH * 0.5);
        ctx.lineTo(cx - bodyW * 0.5, cy + bodyH * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(cx, cy - bodyH * 0.5);
        ctx.lineTo(cx, cy + bodyH * 0.5);
        ctx.lineTo(cx - bodyW * 0.5, cy + bodyH * 0.2);
        ctx.closePath();
        ctx.fill();

        // Cabeza (sombrero boyacense simplificado)
        const headY = cy - bodyH * 0.5 - bodyW * 0.22;
        ctx.fillStyle = '#E8C99B';
        ctx.beginPath();
        ctx.arc(cx, headY, bodyW * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.ink;
        ctx.beginPath();
        ctx.ellipse(cx, headY - bodyW * 0.05, bodyW * 0.3, bodyW * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, headY - bodyW * 0.14, bodyW * 0.16, bodyW * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawHUD(w, h) {
        ctx.save();
        ctx.fillStyle = PALETTE.panel;
        const pillW = 150, pillH = 34;
        roundRect(4, 8, pillW, pillH, 10);
        ctx.fill();
        ctx.fillStyle = PALETTE.cream;
        ctx.font = 'bold 16px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(distance) + ' m', 14, 8 + pillH / 2);

        ctx.fillStyle = PALETTE.panel;
        roundRect(w - 114, 8, 110, pillH, 10);
        ctx.fill();
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.ellipse(w - 96, 8 + pillH / 2, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.cream;
        ctx.textAlign = 'left';
        ctx.fillText(String(seedsCollected), w - 78, 8 + pillH / 2);
        ctx.restore();
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawOverlay(w, h, kind) {
        ctx.save();
        ctx.fillStyle = 'rgba(16,18,34,0.62)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 30px Georgia, serif';
        ctx.fillText(kind === 'menu' ? 'Runner 3D' : 'Game Over', w / 2, h * 0.28);

        ctx.fillStyle = PALETTE.cream;
        ctx.font = '16px Georgia, serif';
        ctx.fillText('Semillas de Iguaque — prototipo', w / 2, h * 0.28 + 30);

        if (kind === 'menu') {
            ctx.font = '15px Georgia, serif';
            ctx.fillText('Desliza izquierda / derecha para cambiar de carril', w / 2, h * 0.46);
            ctx.fillText('Desliza hacia arriba (o toca) para saltar', w / 2, h * 0.46 + 26);
            ctx.fillStyle = PALETTE.gold;
            ctx.font = 'bold 18px Georgia, serif';
            ctx.fillText('Toca para empezar', w / 2, h * 0.58);
            ctx.fillStyle = PALETTE.cream;
            ctx.font = '14px Georgia, serif';
            ctx.fillText('Mejor distancia: ' + best + ' m', w / 2, h * 0.58 + 30);
        } else {
            ctx.font = '18px Georgia, serif';
            ctx.fillText('Distancia: ' + justFinishedDistance + ' m', w / 2, h * 0.46);
            ctx.fillText('Semillas: ' + seedsCollected, w / 2, h * 0.46 + 26);
            ctx.fillStyle = PALETTE.gold;
            ctx.font = 'bold 18px Georgia, serif';
            ctx.fillText('Toca para reintentar', w / 2, h * 0.6);
            ctx.fillStyle = PALETTE.cream;
            ctx.font = '14px Georgia, serif';
            ctx.fillText('Mejor distancia: ' + best + ' m', w / 2, h * 0.6 + 26);
        }

        // Enlace de regreso al juego original
        ctx.font = '14px Georgia, serif';
        const linkText = 'Volver al juego original';
        const linkY = h * 0.86;
        const metrics = ctx.measureText(linkText);
        backLinkBox = { x: w / 2 - metrics.width / 2 - 12, y: linkY - 16, w: metrics.width + 24, h: 32 };
        ctx.strokeStyle = PALETTE.terracotta;
        ctx.lineWidth = 1;
        ctx.strokeRect(backLinkBox.x, backLinkBox.y, backLinkBox.w, backLinkBox.h);
        ctx.fillStyle = PALETTE.terracotta;
        ctx.fillText(linkText, w / 2, linkY);

        ctx.restore();
    }

    // ─── Loop ───
    function loop(t) {
        requestAnimationFrame(loop);
        const dt = Math.min((t - lastTime) / 1000, 0.05);
        lastTime = t;
        try {
            update(dt);
            draw();
        } catch (e) {
            console.error('Error en runner loop:', e);
        }
    }

    lastTime = performance.now();
    requestAnimationFrame(loop);

    // ─── Debug / testing (espejo de window.iguaqueGame del juego original) ───
    window.iguaqueRunner = {
        getState: function() { return state; },
        getPlayer: function() { return player; },
        getObstacles: function() { return obstacles; },
        getSeeds: function() { return seeds; },
        getDistance: function() { return distance; },
        getSpeed: function() { return speed; },
        start: startGame,
        setLane: function(l) { player.lane = clamp(l, 0, 2); },
        forceJump: jump,
        forceGameOver: gameOver,
        // Avance manual de frames (util para probar con el tab en background,
        // donde requestAnimationFrame queda en pausa por el navegador)
        step: function(dt) { update(dt || 1 / 60); draw(); }
    };
})();
