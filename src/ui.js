/**
 * ui.js - Sistema de UI completo
 * Semillas de Iguaque: Run del Altiplano
 */

// ─── Constantes de personajes (habilidades implementadas en player.js) ───
const CHARACTERS = [
    { id: 'mateo', name: 'Mateo', ability: 'Corredor estandar', color: '#4A6741', cost: 0 },
    { id: 'bochica', name: 'Bochica', ability: 'Salto mas alto', color: '#1E5F74', cost: 250 },
    { id: 'policarpa', name: 'Policarpa', ability: 'Semillas x2', color: '#8B2500', cost: 600 },
    { id: 'yato', name: 'El Yato', ability: 'Planeo superior', color: '#5B7C8D', cost: 1200 },
    { id: 'pedro', name: 'Pedro Pascasio', ability: 'Doble salto', color: '#D4853C', cost: 2500 },
    { id: 'santander', name: 'Santander', ability: 'Escudo cada 20s', color: '#2F4F4F', cost: 5000 }
];

class UI {
    constructor(canvas) {
        this.canvas = canvas;
        this.buttons = [];
        this.menuParticles = [];
        this.menuParticleTimer = 0;
        this.titleBounce = 0;
        this.flashOpacity = 0;

        // ─── FEATURE 4: Animaciones de UI ───
        this.menuAnimTimer = 0;
        this.hasMenuAnimated = false;

        // ─── FEATURE 2: Créditos ───
        this.creditsScrollY = 0;
        this.creditsScrollSpeed = 30;

        // ─── FEATURE 3: Leaderboard ───
        this.leaderboardScores = [
            { name: 'Mateo', distance: 2500, seeds: 450 },
            { name: 'Bochica', distance: 1800, seeds: 320 },
            { name: 'Policarpa', distance: 1200, seeds: 210 },
            { name: 'El Yato', distance: 800, seeds: 150 },
            { name: 'Pedro', distance: 500, seeds: 85 }
        ];

        // ─── FEATURE 1: Personajes ───
        this.selectedCharacter = 'mateo';
        this.unlockedCharacters = ['mateo'];
        this.totalSeeds = 0;
    }

    // ─── Botones ───

    createButton(x, y, w, h, text, color, hoverColor, action) {
        return { x, y, w, h, text, color, hoverColor, action, hover: false };
    }

    checkButtons(buttons, mx, my) {
        for (const btn of buttons) {
            btn.hover = (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h);
        }
    }

    findClickedButton(buttons, mx, my) {
        for (const btn of buttons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                return btn;
            }
        }
        return null;
    }

    drawButton(ctx, btn) {
        ctx.save();
        const base = btn.hover ? btn.hoverColor : btn.color;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        roundRect(ctx, btn.x + 2, btn.y + 4, btn.w, btn.h, 12);
        ctx.fill();

        // Boton con gradiente vertical
        let fill = base;
        try {
            const grad = ctx.createLinearGradient(0, btn.y, 0, btn.y + btn.h);
            grad.addColorStop(0, shadeColor(base, 1.18));
            grad.addColorStop(1, shadeColor(base, 0.82));
            fill = grad;
        } catch (e) {}
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = btn.hover ? '#F4C430' : 'rgba(240,230,210,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Brillo superior sutil
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        roundRect(ctx, btn.x + 3, btn.y + 3, btn.w - 6, btn.h * 0.42, 9);
        ctx.fill();

        // Texto
        drawText(ctx, btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1, 18, '#f0e6d2', 'center');

        ctx.restore();
    }

    // ─── FEATURE 4: Easing ───

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // ─── FEATURE 4: Animacion de entrada para menu ───

    updateMenuAnim(dt) {
        if (this.menuAnimTimer < 1) {
            this.menuAnimTimer = Math.min(1, this.menuAnimTimer + dt * 2);
        }
    }

    resetMenuAnim() {
        this.menuAnimTimer = 0;
        this.hasMenuAnimated = false;
    }

    // ─── Menú Principal ───

    getMenuButtons(w, h) {
        const bw = 220;
        const bh = 55;
        const bx = (w - bw) / 2;
        const by = h * 0.52;
        // Separacion adaptable: en pantallas bajas los botones se compactan
        const gap = Math.max(60, Math.min(70, (h * 0.40 - bh) / 4));
        return [
            this.createButton(bx, by, bw, bh, 'Jugar', '#4A6741', '#3d5637', 'play'),
            this.createButton(bx, by + gap, bw, bh, 'Tarjetas', '#D4853C', '#b06d2e', 'cards'),
            this.createButton(bx, by + gap * 2, bw, bh, 'Configuracion', '#1E5F74', '#164a5a', 'settings'),
            // ─── FEATURE 1 & 3: Botones nuevos ───
            this.createButton(bx, by + gap * 3, bw, bh, 'Personajes', '#8B2500', '#6d1d00', 'characters'),
            this.createButton(bx, by + gap * 4, bw, bh, 'Leaderboard', '#2F4F4F', '#223a3a', 'leaderboard')
        ];
    }

    drawMenu(ctx, w, h, dt) {
        // ─── FEATURE 4: Actualizar animacion ───
        this.updateMenuAnim(dt);

        // Fondo animado
        this.drawMenuBackground(ctx, w, h, dt);

        // ─── FEATURE 4: Animacion de entrada ───
        const animEased = this.easeOutBack(this.menuAnimTimer);
        const titleY = h * 0.14 + (1 - animEased) * 50;

        // Título con animacion y sombra profunda
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        drawTextStroke(ctx, 'SEMILLAS DE', w / 2, titleY, 26, '#D4853C', '#1a1a2e', 'center');
        drawTextStroke(ctx, 'IGUAQUE', w / 2, titleY + 44, 52, '#f0e6d2', '#D4853C', 'center');
        ctx.restore();

        // Subtitulo en chip
        const subW = 200;
        ctx.fillStyle = 'rgba(16,18,34,0.55)';
        roundRect(ctx, w / 2 - subW / 2, titleY + 66, subW, 28, 14);
        ctx.fill();
        drawText(ctx, 'Run del Altiplano', w / 2, titleY + 81, 15, '#F4C430', 'center');

        // ─── FEATURE 4: Botones con stagger animation ───
        const buttons = this.getMenuButtons(w, h);
        buttons.forEach((btn, i) => {
            const btnAnim = Math.min(1, this.menuAnimTimer * 2 - i * 0.15);
            if (btnAnim <= 0) {
                btn._visible = false;
                return;
            }
            btn._visible = true;
            const eased = this.easeOutBack(Math.max(0, btnAnim));
            btn._offsetX = (1 - eased) * 100;
        });

        // ─── FEATURE 4: High score parpadeante ───
        const highScore = getHighScore ? getHighScore() : 0;
        if (highScore > 0) {
            const alpha = 0.7 + Math.sin(Date.now() / 500) * 0.3;
            ctx.globalAlpha = alpha;
            drawText(ctx, 'Record: ' + Math.floor(highScore) + 'm', w / 2, h * 0.95, 16, '#F4C430', 'center');
            ctx.globalAlpha = 1;
        }

        return buttons;
    }

    drawMenuBackground(ctx, w, h, dt) {
        // Fondo ilustrado del paramo si esta disponible
        const bg = getZoneBgImage(0);
        if (bg) {
            const scale = Math.max(w / bg.naturalWidth, h / bg.naturalHeight);
            const dw = bg.naturalWidth * scale;
            const dh = bg.naturalHeight * scale;
            ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
            // Overlay para legibilidad del menu
            const ov = ctx.createLinearGradient(0, 0, 0, h);
            ov.addColorStop(0, 'rgba(14,16,30,0.55)');
            ov.addColorStop(0.45, 'rgba(14,16,30,0.30)');
            ov.addColorStop(1, 'rgba(14,16,30,0.78)');
            ctx.fillStyle = ov;
            ctx.fillRect(0, 0, w, h);
        } else {
            // Gradiente de fondo (fallback)
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#1a1a2e');
            grad.addColorStop(0.5, '#16213e');
            grad.addColorStop(1, '#0f3460');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // Particulas del menu
        this.menuParticleTimer += dt;
        if (this.menuParticleTimer > 0.3) {
            this.menuParticleTimer = 0;
            this.menuParticles.push({
                x: Math.random() * w,
                y: h + 10,
                vx: random(-10, 10),
                vy: random(-30, -60),
                life: random(3, 6),
                size: random(1, 3),
                color: ['#F4C430', '#D4853C', '#C9A84C', '#f0e6d2'][Math.floor(Math.random() * 4)]
            });
        }

        for (let i = this.menuParticles.length - 1; i >= 0; i--) {
            const p = this.menuParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.menuParticles.splice(i, 1);
                continue;
            }
            const alpha = clamp(p.life / 2, 0, 1);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Estrellas fijas (solo en fondo fallback; sobre la ilustracion no aplican)
        if (!bg) {
            ctx.fillStyle = '#f0e6d2';
            for (let i = 0; i < 30; i++) {
                const sx = (i * 137.5) % w;
                const sy = (i * 73.2) % (h * 0.4);
                const ss = 1 + (i % 3) * 0.5;
                const twinkle = Math.sin(Date.now() * 0.001 + i) * 0.3 + 0.7;
                ctx.save();
                ctx.globalAlpha = twinkle;
                ctx.beginPath();
                ctx.arc(sx, sy, ss, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // ─── HUD ───

    drawHUD(ctx, game) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const pillH = 36;
        const pillY = 10;

        ctx.save();

        // Pill de distancia (izquierda)
        const dist = Math.floor(game.distance);
        const distText = dist + ' m';
        ctx.font = 'bold 19px Georgia, serif';
        const distW = Math.max(86, ctx.measureText(distText).width + 30);
        ctx.fillStyle = 'rgba(16,18,34,0.55)';
        roundRect(ctx, 12, pillY, distW, pillH, pillH / 2);
        ctx.fill();
        drawText(ctx, distText, 12 + distW / 2, pillY + pillH / 2 + 1, 19, '#f0e6d2', 'center');

        // Pill de semillas
        const seedText = '' + game.seeds;
        ctx.font = 'bold 17px Georgia, serif';
        const seedPillW = Math.max(76, ctx.measureText(seedText).width + 46);
        const seedPillX = 12 + distW + 8;
        ctx.fillStyle = 'rgba(16,18,34,0.55)';
        roundRect(ctx, seedPillX, pillY, seedPillW, pillH, pillH / 2);
        ctx.fill();
        drawSeed(ctx, seedPillX + 18, pillY + pillH / 2, 8, false);
        drawText(ctx, seedText, seedPillX + 32 + (seedPillW - 42) / 2, pillY + pillH / 2 + 1, 17, '#F4C430', 'center');

        // Power-up activo (debajo del pill izquierdo)
        game.powerupSystem.drawHUD(ctx, 12, pillY + pillH + 8);

        // Anuncio flotante (cambio de zona, boss superado)
        if (game.zoneAnnounceTimer > 0 && game.announceText) {
            const a = clamp(game.zoneAnnounceTimer, 0, 1);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgba(16,18,34,0.5)';
            ctx.font = 'bold 22px Georgia, serif';
            const zw = Math.min(w - 20, ctx.measureText(game.announceText).width + 50);
            roundRect(ctx, w / 2 - zw / 2, h * 0.16 - 24, zw, 48, 24);
            ctx.fill();
            drawTextStroke(ctx, game.announceText, w / 2, h * 0.16, 22, '#F4C430', '#1a1a2e', 'center');
            ctx.restore();
        }

        // Boss warning indicator
        if (game.bossSystem.isWarning) {
            this.flashOpacity = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 69, 0, ${this.flashOpacity * 0.3})`;
            ctx.fillRect(0, pillY + pillH + 4, w, 5);
        }

        // Boton de pausa (44px de area tactil)
        ctx.fillStyle = 'rgba(16,18,34,0.55)';
        ctx.beginPath();
        ctx.arc(w - 32, pillY + pillH / 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(240,230,210,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f0e6d2';
        ctx.fillRect(w - 39, pillY + 10, 5, 16);
        ctx.fillRect(w - 30, pillY + 10, 5, 16);

        ctx.restore();
    }

    // ─── Pausa ───

    getPauseButtons(w, h) {
        const bw = 200;
        const bh = 50;
        const bx = (w - bw) / 2;
        const by = h * 0.4;
        return [
            this.createButton(bx, by, bw, bh, 'Continuar', '#4A6741', '#3d5637', 'resume'),
            this.createButton(bx, by + 70, bw, bh, 'Menu Principal', '#8B7D6B', '#6e6354', 'menu')
        ];
    }

    drawPause(ctx, w, h) {
        // Overlay oscuro
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, w, h);

        drawTextStroke(ctx, 'PAUSA', w / 2, h * 0.25, 36, '#f0e6d2', '#D4853C', 'center');

        return this.getPauseButtons(w, h);
    }

    // ─── FEATURE 5: Game Over Mejorado ───

    getGameOverButtons(w, h) {
        const bw = 220;
        const bh = 55;
        const bx = (w - bw) / 2;
        const by = h * 0.72;
        return [
            this.createButton(bx, by, bw, bh, 'Reintentar', '#4A6741', '#3d5637', 'retry'),
            this.createButton(bx, by + 70, bw, bh, 'Menu Principal', '#8B7D6B', '#6e6354', 'menu'),
            // ─── FEATURE 2: Boton creditos ───
            this.createButton(bx, by + 140, bw, bh, 'Creditos', '#1E5F74', '#164a5a', 'credits')
        ];
    }

    drawStat(ctx, x, y, label, value, color) {
        drawText(ctx, label, x, y, 12, '#888', 'center');
        drawText(ctx, value, x, y + 25, 28, color, 'center');
    }

    drawGameOver(ctx, w, h, game) {
        const score = game.distance;
        const highScore = game.highScore || 0;
        const seeds = game.seeds;
        const isNewHigh = score > highScore && score > 0;
        const card = game.lastUnlockedCard;

        // Overlay oscuro con fade
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, w, h);

        // Panel central (mas compacto si no hay tarjeta desbloqueada)
        const panelW = Math.min(450, w * 0.9);
        const panelH = card ? 420 : 300;
        const panelX = (w - panelW) / 2;
        const panelY = Math.max(30, h * 0.68 - panelH - 20);

        // Fondo del panel con borde dorado si es nuevo record
        roundRect(ctx, panelX, panelY, panelW, panelH, 16);
        ctx.fillStyle = '#2a2a3e';
        ctx.fill();
        ctx.strokeStyle = isNewHigh ? '#FFD700' : '#D4853C';
        ctx.lineWidth = isNewHigh ? 4 : 2;
        ctx.stroke();

        // GAME OVER
        drawTextStroke(ctx, 'GAME OVER', w / 2, panelY + 50, 36, '#ff4444', '#000', 'center');

        // Nuevo record
        if (isNewHigh) {
            const shine = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.globalAlpha = shine;
            drawText(ctx, 'NUEVO RECORD', w / 2, panelY + 85, 20, '#FFD700', 'center');
            ctx.globalAlpha = 1;
        }

        // Stats
        const statsY = panelY + 130;
        this.drawStat(ctx, w / 2 - 80, statsY, 'DISTANCIA', Math.floor(score) + 'm', '#f0e6d2');
        this.drawStat(ctx, w / 2 + 80, statsY, 'SEMILLAS', seeds + '', '#F4C430');

        // High score y total de semillas acumuladas
        if (!isNewHigh && highScore > 0) {
            drawText(ctx, 'Record: ' + Math.floor(highScore) + 'm', w / 2, statsY + 68, 14, '#888', 'center');
        }
        const totalSeeds = (typeof getSeeds === 'function') ? getSeeds() : 0;
        drawText(ctx, 'Semillas acumuladas: ' + totalSeeds, w / 2, statsY + 90, 13, '#a89f8d', 'center');

        // Tarjeta desbloqueada
        if (card) {
            const cardY = panelY + 230;
            ctx.fillStyle = 'rgba(212, 133, 60, 0.2)';
            roundRect(ctx, panelX + 20, cardY, panelW - 40, 80, 10);
            ctx.fill();
            drawText(ctx, 'Tarjeta desbloqueada:', w / 2, cardY + 20, 14, '#D4853C', 'center');
            drawText(ctx, card.titulo, w / 2, cardY + 50, 16, '#f0e6d2', 'center');
        }

        // Botones (renderizados por el caller usando getGameOverButtons)
        return this.getGameOverButtons(w, h);
    }

    // ─── Configuracion ───

    getSettingsButtons(w, h) {
        const bw = 250;
        const bh = 45;
        const bx = (w - bw) / 2;
        const by = h * 0.35;
        const settings = getSettings();
        return [
            this.createButton(bx, by, bw, bh,
                'Musica: ' + Math.round(settings.musicVolume * 100) + '%',
                '#1E5F74', '#164a5a', 'music_vol'),
            this.createButton(bx, by + 60, bw, bh,
                'SFX: ' + Math.round(settings.sfxVolume * 100) + '%',
                '#1E5F74', '#164a5a', 'sfx_vol'),
            this.createButton(bx, by + 120, bw, bh,
                'Creditos', '#8B2500', '#6d1d00', 'credits'),
            this.createButton(bx + (bw - 140) / 2, by + 190, 140, 45,
                'Volver', '#8B7D6B', '#6e6354', 'back')
        ];
    }

    drawSettings(ctx, w, h) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, w, h);

        drawTextStroke(ctx, 'CONFIGURACION', w / 2, h * 0.15, 30, '#f0e6d2', '#D4853C', 'center');

        // Instrucciones
        drawText(ctx, 'Toca los botones para ajustar volumenes', w / 2, h * 0.25, 14, '#888', 'center');

        return this.getSettingsButtons(w, h);
    }

    // ─── FEATURE 1: Menu de seleccion de personajes ───

    getCharacterSelectButtons(w, h) {
        return [
            this.createButton(w / 2 - 80, h - 70, 160, 50, 'Volver', '#555', '#444', 'back')
        ];
    }

    drawCharacterSelect(ctx, w, h, characters, selectedId, unlockedIds, seeds) {
        // Fondo
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Titulo
        drawTextStroke(ctx, 'PERSONAJES', w / 2, 55, 30, '#f0e6d2', '#D4853C', 'center');
        // Chip de semillas disponibles
        ctx.font = 'bold 15px Georgia, serif';
        const chipW = ctx.measureText(seeds + ' semillas').width + 46;
        ctx.fillStyle = 'rgba(244,196,48,0.12)';
        roundRect(ctx, w / 2 - chipW / 2, 78, chipW, 30, 15);
        ctx.fill();
        drawSeed(ctx, w / 2 - chipW / 2 + 18, 93, 7, false);
        drawText(ctx, seeds + ' semillas', w / 2 + 8, 94, 15, '#F4C430', 'center');

        // Tarjetas de personajes (grid 2 x 3, alto adaptable a la pantalla)
        const cardW = (w - 60) / 2;
        const rowsCount = Math.ceil(characters.length / 2);
        const cardH = Math.min(180, Math.max(120, (h - 210) / rowsCount - 16));
        const startX = 20;
        const startY = 124;
        // Guardar layout para el hit-test de game.js
        this.charLayout = { startX, startY, cardW, cardH, gap: 16 };

        characters.forEach((char, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + col * (cardW + 20);
            const y = startY + row * (cardH + 16);
            const isUnlocked = unlockedIds.includes(char.id);
            const isSelected = selectedId === char.id;

            // Fondo de tarjeta
            ctx.fillStyle = isSelected ? '#2a3a2e' : '#2a2a3e';
            roundRect(ctx, x, y, cardW, cardH, 12);
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#D4853C' : (isUnlocked ? '#555' : '#333');
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.stroke();

            const avatarCX = x + cardW / 2;
            const avatarCY = y + cardH * 0.34;
            const avatarR = Math.min(32, cardH * 0.22);

            if (isUnlocked) {
                // Sprite del personaje (circulo con color)
                ctx.fillStyle = char.color;
                ctx.beginPath();
                ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#f0e6d2';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Ojos (simples)
                const eyeOff = avatarR * 0.3;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(avatarCX - eyeOff, avatarCY - avatarR * 0.15, avatarR * 0.18, 0, Math.PI * 2);
                ctx.arc(avatarCX + eyeOff, avatarCY - avatarR * 0.15, avatarR * 0.18, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a2e';
                ctx.beginPath();
                ctx.arc(avatarCX - eyeOff, avatarCY - avatarR * 0.15, avatarR * 0.09, 0, Math.PI * 2);
                ctx.arc(avatarCX + eyeOff, avatarCY - avatarR * 0.15, avatarR * 0.09, 0, Math.PI * 2);
                ctx.fill();

                // Sonrisa
                ctx.beginPath();
                ctx.arc(avatarCX, avatarCY + avatarR * 0.1, avatarR * 0.35, 0.2 * Math.PI, 0.8 * Math.PI);
                ctx.strokeStyle = '#f0e6d2';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Nombre
                drawText(ctx, char.name, avatarCX, y + cardH * 0.68, 17, '#f0e6d2', 'center');

                // Habilidad
                drawText(ctx, char.ability, avatarCX, y + cardH * 0.81, 12, '#a89f8d', 'center');

                if (isSelected) {
                    drawText(ctx, 'SELECCIONADO', avatarCX, y + cardH - 13, 11, '#D4853C', 'center');
                }
            } else {
                // Bloqueado - overlay oscuro
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                roundRect(ctx, x, y, cardW, cardH, 12);
                ctx.fill();

                // Candado dibujado (sin emoji)
                const lockY = y + cardH * 0.36;
                ctx.strokeStyle = '#F4C430';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(avatarCX, lockY - 4, 8, Math.PI, 0);
                ctx.stroke();
                ctx.fillStyle = '#F4C430';
                roundRect(ctx, avatarCX - 12, lockY - 4, 24, 18, 4);
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath();
                ctx.arc(avatarCX, lockY + 4, 3, 0, Math.PI * 2);
                ctx.fill();

                // Nombre oculto y costo
                drawText(ctx, '???', avatarCX, y + cardH * 0.68, 17, '#777', 'center');
                drawText(ctx, char.cost + ' semillas', avatarCX, y + cardH * 0.83, 13, '#F4C430', 'center');
            }
        });

        // Boton volver
        return this.getCharacterSelectButtons(w, h);
    }

    // ─── FEATURE 3: Leaderboard local ───

    getLeaderboardButtons(w, h) {
        return [
            this.createButton(w / 2 - 80, h - 70, 160, 50, 'Volver', '#555', '#444', 'back')
        ];
    }

    drawLeaderboard(ctx, w, h, scores) {
        // Gradiente de fondo
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        drawTextStroke(ctx, 'MEJORES CARRERAS', w / 2, 60, 28, '#f0e6d2', '#D4853C', 'center');

        // Datos reales del almacenamiento local
        const displayScores = (typeof getLeaderboard === 'function') ? getLeaderboard() : (scores || []);

        if (displayScores.length === 0) {
            // Estado vacio
            drawText(ctx, 'Aun no hay carreras registradas', w / 2, h * 0.4, 18, '#a89f8d', 'center');
            drawText(ctx, 'Corre por el altiplano y vuelve aqui', w / 2, h * 0.4 + 32, 14, '#777', 'center');
            return this.getLeaderboardButtons(w, h);
        }

        // Header
        const margin = Math.max(20, w * 0.06);
        ctx.fillStyle = '#D4853C';
        roundRect(ctx, margin, 90, w - margin * 2, 40, 8);
        ctx.fill();
        drawText(ctx, '#', margin + 18, 112, 14, '#1a1a2e', 'left');
        drawText(ctx, 'PERSONAJE', margin + 55, 112, 14, '#1a1a2e', 'left');
        drawText(ctx, 'METROS', w - margin - 150, 112, 14, '#1a1a2e', 'left');
        drawText(ctx, 'SEMILLAS', w - margin - 20, 112, 14, '#1a1a2e', 'right');

        // Filas
        displayScores.forEach((score, i) => {
            const y = 140 + i * 54;
            ctx.fillStyle = i % 2 === 0 ? '#2a2a3e' : '#222236';
            roundRect(ctx, margin, y, w - margin * 2, 48, 8);
            ctx.fill();

            // Rank con color especial para top 3
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
            drawText(ctx, '' + (i + 1), margin + 18, y + 20, 18, rankColors[i] || '#aaa', 'left');
            drawText(ctx, score.character || 'Mateo', margin + 55, y + 20, 15, '#f0e6d2', 'left');
            // Fecha pequena debajo del personaje
            if (score.date) {
                const d = new Date(score.date);
                const dateStr = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
                drawText(ctx, dateStr, margin + 55, y + 38, 10, '#777', 'left');
            }
            drawText(ctx, score.distance + ' m', w - margin - 150, y + 26, 16, '#f0e6d2', 'left');
            drawSeed(ctx, w - margin - 60, y + 26, 6, false);
            drawText(ctx, '' + score.seeds, w - margin - 20, y + 26, 15, '#F4C430', 'right');
        });

        // Boton volver
        return this.getLeaderboardButtons(w, h);
    }

    // ─── FEATURE 2: Pantalla de creditos institucionales ───

    getCreditsButtons(w, h) {
        return [
            this.createButton(w / 2 - 80, h - 70, 160, 50, 'Volver', '#555', '#444', 'back')
        ];
    }

    updateCredits(dt) {
        this.creditsScrollY += this.creditsScrollSpeed * dt;
        // Loop: cuando todo el contenido salio de pantalla, reiniciar
        const contentH = 780;
        if (this.creditsScrollY > contentH + this.canvas.height * 0.3) {
            this.creditsScrollY = -this.canvas.height * 0.4;
        }
    }

    resetCredits() {
        this.creditsScrollY = 0;
    }

    drawCredits(ctx, w, h) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Gradiente
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#0f3460');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const credits = [
            { type: 'title', text: 'SEMILLAS DE IGUAQUE', size: 28, color: '#D4853C' },
            { type: 'subtitle', text: 'Run del Altiplano', size: 18, color: '#aaa' },
            { type: 'spacer' },
            { type: 'header', text: 'FINANCIADO POR', size: 16, color: '#F4C430' },
            { type: 'text', text: 'Secretaria de Cultura y Patrimonio', size: 20, color: '#f0e6d2' },
            { type: 'text', text: 'Gobernacion de Boyaca', size: 18, color: '#f0e6d2' },
            { type: 'spacer' },
            { type: 'header', text: 'DESARROLLADO POR', size: 16, color: '#F4C430' },
            { type: 'text', text: 'Proponente local de Tunja', size: 18, color: '#f0e6d2' },
            { type: 'text', text: 'Tunja, Boyaca', size: 14, color: '#aaa' },
            { type: 'spacer' },
            { type: 'header', text: 'AGRADECIMIENTOS', size: 16, color: '#F4C430' },
            { type: 'text', text: 'ICANH - Instituto Colombiano de Antropologia', size: 14, color: '#aaa' },
            { type: 'text', text: 'UPTC - Universidad Pedagogica de Tunja', size: 14, color: '#aaa' },
            { type: 'text', text: 'Comunidades indigenas U\u2019wa y Muisca', size: 14, color: '#aaa' },
            { type: 'spacer' },
            { type: 'header', text: 'MUSICA Y AUDIO', size: 16, color: '#F4C430' },
            { type: 'text', text: 'Musica carranga tradicional de Boyaca', size: 14, color: '#aaa' },
            { type: 'spacer' },
            { type: 'text', text: '\u00A9 2025 - Semillas de Iguaque', size: 12, color: '#666' },
            { type: 'text', text: 'Todos los derechos reservados', size: 12, color: '#666' },
        ];

        let y = 80 - this.creditsScrollY;
        credits.forEach(line => {
            if (line.type === 'spacer') {
                y += 30;
            } else {
                const fontSize = line.size || 16;
                drawText(ctx, line.text, w / 2, y, fontSize, line.color || '#f0e6d2', 'center');
                y += fontSize * 1.5;
            }
        });

        // Boton volver
        return this.getCreditsButtons(w, h);
    }

    // ─── Helper global ───
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
