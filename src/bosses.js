/**
 * bosses.js - Sistema de 3 bosses
 * Semillas de Iguaque: Run del Altiplano
 */

class BossSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
        this.isActive = false;
        this.currentBoss = null;
        this.timer = 0;
        this.duration = 15;
        this.warningTimer = 0;
        this.isWarning = false;

        // Busiraco - rayos
        this.bolts = [];
        this.boltSpawnTimer = 0;

        // Mohan - niebla
        this.fogDensity = 0;

        // Perro
        this.perroY = 0;
        this.perroVy = 0;
        this.perroState = 'idle'; // idle, rising, falling
        this.perroTimer = 0;

        // Callback al sobrevivir un boss (lo asigna game.js)
        this.onSurvive = null;
    }

    // ─── Activación ───

    trigger(distance) {
        const bossDistance = 1000;
        const distInCycle = distance % (bossDistance * 3);
        let bossType;
        if (distInCycle < bossDistance) bossType = 'busiraco';
        else if (distInCycle < bossDistance * 2) bossType = 'mohan';
        else bossType = 'perro';

        this.isWarning = true;
        this.warningTimer = 3;
        this.pendingBoss = bossType;
        audioManager.playSFX('boss_warning');
    }

    start(bossType) {
        this.isActive = true;
        this.currentBoss = bossType;
        this.timer = this.duration;
        this.isWarning = false;

        // Reset boss-specific state
        this.bolts = [];
        this.boltSpawnTimer = 0;
        this.fogDensity = 0;
        this.perroY = this.canvasH + 100;
        this.perroVy = 0;
        this.perroState = 'idle';
        this.perroTimer = 0;

        audioManager.playMusic('boss');
    }

    end() {
        const survived = this.currentBoss;
        this.isActive = false;
        this.currentBoss = null;
        this.isWarning = false;
        audioManager.playMusic('gameplay');
        // Bonus por sobrevivir (end solo se llama cuando el timer expira)
        if (survived && this.onSurvive) {
            this.onSurvive(survived);
        }
    }

    // ─── Actualización ───

    update(dt) {
        // Warning
        if (this.isWarning) {
            this.warningTimer -= dt;
            if (this.warningTimer <= 0) {
                this.start(this.pendingBoss);
            }
            return;
        }

        if (!this.isActive) return;

        this.timer -= dt;
        if (this.timer <= 0) {
            this.end();
            return;
        }

        switch (this.currentBoss) {
            case 'busiraco':
                this.updateBusiraco(dt);
                break;
            case 'mohan':
                this.updateMohan(dt);
                break;
            case 'perro':
                this.updatePerro(dt);
                break;
        }
    }

    updateBusiraco(dt) {
        this.boltSpawnTimer -= dt;
        if (this.boltSpawnTimer <= 0) {
            this.boltSpawnTimer = random(0.6, 1.5);
            const x = random(this.canvasW * 0.3, this.canvasW * 0.9);
            this.bolts.push({
                x: x,
                y: -50,
                targetY: this.GROUND_Y + 20,
                speed: random(400, 700),
                width: random(20, 40),
                active: true,
                flash: 0
            });
        }

        for (const bolt of this.bolts) {
            if (!bolt.active) continue;
            bolt.y += bolt.speed * dt;
            bolt.flash += dt * 10;
            if (bolt.y >= bolt.targetY) {
                bolt.active = false;
            }
        }

        this.bolts = this.bolts.filter(b => b.active || b.flash < 3);
    }

    updateMohan(dt) {
        this.fogDensity = 0.7 + Math.sin(Date.now() * 0.001) * 0.1;
    }

    updatePerro(dt) {
        this.perroTimer += dt;

        switch (this.perroState) {
            case 'idle':
                if (this.perroTimer > random(2, 4)) {
                    this.perroState = 'rising';
                    this.perroY = this.canvasH + 100;
                    this.perroVy = -500;
                    this.perroTimer = 0;
                }
                break;
            case 'rising':
                this.perroY += this.perroVy * dt;
                this.perroVy += 200 * dt; // desacelerar subida
                if (this.perroVy >= 0) {
                    this.perroState = 'falling';
                }
                break;
            case 'falling':
                this.perroVy += 600 * dt;
                this.perroY += this.perroVy * dt;
                if (this.perroY > this.canvasH + 200) {
                    this.perroState = 'idle';
                    this.perroTimer = 0;
                    this.perroY = this.canvasH + 200;
                }
                break;
        }
    }

    // ─── Colisiones ───

    checkCollision(player) {
        if (!this.isActive) return false;
        const pBox = player.getHitbox();

        switch (this.currentBoss) {
            case 'busiraco':
                for (const bolt of this.bolts) {
                    if (!bolt.active) continue;
                    const bBox = {
                        x: bolt.x - bolt.width / 2,
                        y: bolt.y - 20,
                        w: bolt.width,
                        h: 40
                    };
                    if (rectCollision(pBox, bBox)) {
                        bolt.active = false;
                        return true;
                    }
                }
                break;

            case 'perro':
                if (this.perroState === 'falling') {
                    const perroBox = {
                        x: this.canvasW * 0.3,
                        y: this.perroY - 80,
                        w: this.canvasW * 0.5,
                        h: 100
                    };
                    if (rectCollision(pBox, perroBox)) {
                        return true;
                    }
                }
                break;
        }

        return false;
    }

    // ─── Dibujo ───

    draw(ctx, player) {
        if (this.isWarning) {
            this.drawWarning(ctx);
            return;
        }
        if (!this.isActive) return;

        switch (this.currentBoss) {
            case 'busiraco':
                this.drawBusiraco(ctx);
                break;
            case 'mohan':
                this.drawMohan(ctx, player);
                break;
            case 'perro':
                this.drawPerro(ctx);
                break;
        }

        // Timer del boss
        const timeLeft = Math.ceil(this.timer);
        drawTextStroke(ctx, timeLeft + 's', this.canvasW / 2, 40, 24, '#fff', '#000', 'center');
    }

    drawWarning(ctx) {
        const alpha = Math.sin(this.warningTimer * 4) * 0.3 + 0.3;
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, this.canvasW, this.canvasH);

        const bossNames = {
            'busiraco': 'BUSIRACO',
            'mohan': 'MOHAN',
            'perro': 'PERRO DE SAN FRANCISCO'
        };
        drawTextStroke(ctx, '¡BOSS INMINENTE!', this.canvasW / 2, this.canvasH / 2 - 30, 28, '#FF4500', '#000', 'center');
        drawTextStroke(ctx, bossNames[this.pendingBoss] || '', this.canvasW / 2, this.canvasH / 2 + 20, 22, '#fff', '#000', 'center');
    }

    drawBusiraco(ctx) {
        // Telegraph: marcador pulsante en el suelo donde caera cada rayo
        for (const bolt of this.bolts) {
            if (!bolt.active) continue;
            const progress = clamp(bolt.y / bolt.targetY, 0, 1);
            const pulse = 0.35 + Math.sin(Date.now() / 90) * 0.15;
            ctx.save();
            ctx.globalAlpha = pulse + progress * 0.3;
            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(bolt.x, this.GROUND_Y, bolt.width * 0.9, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = (pulse + progress * 0.3) * 0.4;
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.ellipse(bolt.x, this.GROUND_Y, bolt.width * 0.6, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (const bolt of this.bolts) {
            const alpha = bolt.active ? 1 : Math.max(0, 1 - bolt.flash / 3);
            ctx.save();
            ctx.globalAlpha = alpha;

            // Rayo principal
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = bolt.width * 0.4;
            ctx.beginPath();
            ctx.moveTo(bolt.x, bolt.y);
            let cx = bolt.x;
            for (let by = bolt.y; by > bolt.y - 60; by -= 15) {
                cx += random(-8, 8);
                ctx.lineTo(cx, by);
            }
            ctx.stroke();

            // Halo
            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = bolt.width * 0.8;
            ctx.globalAlpha = alpha * 0.4;
            ctx.beginPath();
            ctx.moveTo(bolt.x, bolt.y);
            ctx.lineTo(bolt.x, bolt.y - 50);
            ctx.stroke();

            // Impacto en suelo
            if (!bolt.active) {
                ctx.fillStyle = '#FFFF00';
                ctx.globalAlpha = alpha * 0.6;
                ctx.beginPath();
                ctx.arc(bolt.x, this.GROUND_Y, 30, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    drawMohan(ctx, player) {
        // Niebla centrada en el jugador: solo se ve lo cercano
        const focusX = player ? player.x + player.width / 2 : this.canvasW / 2;
        const focusY = player ? player.y + player.height / 2 : this.canvasH / 2;
        ctx.save();
        const gradient = ctx.createRadialGradient(
            focusX, focusY, 90,
            focusX, focusY, this.canvasH * 0.6
        );
        gradient.addColorStop(0, 'rgba(150, 160, 170, 0)');
        gradient.addColorStop(1, `rgba(100, 110, 120, ${this.fogDensity})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasW, this.canvasH);

        // Ojos del Mohan en la niebla
        const eyeX = this.canvasW / 2 + Math.sin(Date.now() * 0.002) * 100;
        const eyeY = this.canvasH / 3 + Math.cos(Date.now() * 0.0015) * 30;
        ctx.fillStyle = `rgba(255, 200, 50, ${0.3 + Math.sin(Date.now() * 0.003) * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(eyeX - 20, eyeY, 8, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(eyeX + 20, eyeY, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawPerro(ctx) {
        if (this.perroState === 'idle') return;

        ctx.save();
        const px = this.canvasW * 0.4;
        const py = this.perroY;

        // Sombra
        if (this.perroState === 'falling') {
            const shadowAlpha = clamp(1 - (this.canvasH - py) / 300, 0, 0.5);
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath();
            ctx.ellipse(px + 60, this.GROUND_Y, 80, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cuerpo del perro (silueta)
        ctx.fillStyle = '#1a0a2e';
        ctx.beginPath();
        ctx.ellipse(px + 60, py, 80, 60, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cabeza
        ctx.beginPath();
        ctx.arc(px + 20, py - 30, 40, 0, Math.PI * 2);
        ctx.fill();

        // Ojos rojos brillantes
        ctx.fillStyle = '#FF0000';
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(px + 5, py - 40, 6, 0, Math.PI * 2);
        ctx.arc(px + 35, py - 40, 6, 0, Math.PI * 2);
        ctx.fill();

        // Boca
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + 20, py - 25, 15, 0.1, Math.PI - 0.1);
        ctx.stroke();

        ctx.restore();
    }

    // ─── Reset ───

    reset() {
        this.isActive = false;
        this.currentBoss = null;
        this.isWarning = false;
        this.timer = 0;
        this.warningTimer = 0;
        this.bolts = [];
        this.fogDensity = 0;
        this.perroState = 'idle';
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
    }
}
