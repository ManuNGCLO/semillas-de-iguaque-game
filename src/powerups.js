/**
 * powerups.js - Sistema de 5 power-ups
 * Semillas de Iguaque: Run del Altiplano
 */

const POWERUPS = [
    {
        id: 'ruana',
        name: 'La Ruana',
        color: '#8B2500',
        duration: 10,
        effect: 'glide',
        description: 'Planeo mejorado'
    },
    {
        id: 'cocido',
        name: 'El Cocido',
        color: '#D4853C',
        duration: -1, // hasta usar
        effect: 'shield',
        description: 'Escudo protector'
    },
    {
        id: 'panela',
        name: 'Agua de Panela',
        color: '#F4C430',
        duration: 8,
        effect: 'speed',
        description: 'Velocidad x2'
    },
    {
        id: 'queso',
        name: 'Queso Paipa',
        color: '#C9A84C',
        duration: 12,
        effect: 'magnet',
        description: 'Imán de semillas'
    },
    {
        id: 'carranga',
        name: 'Carranga',
        color: '#FF4500',
        duration: 6,
        effect: 'invincible',
        description: 'Invencible'
    }
];

class PowerupSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
        this.activeItems = []; // power-ups en pantalla
        this.activeEffect = null; // efecto activo
        this.effectTimer = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 8; // segundos entre spawns
    }

    // ─── Spawn ───

    updateSpawn(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnPowerup();
        }
    }

    spawnPowerup() {
        if (this.activeItems.length >= 2) return;
        const powerup = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
        const x = this.canvasW + random(50, 200);
        const y = this.GROUND_Y - random(40, 150);
        this.activeItems.push({
            x: x,
            y: y,
            w: 36,
            h: 36,
            data: powerup,
            bobOffset: random(0, Math.PI * 2),
            collected: false
        });
    }

    // ─── Activación ───

    activate(type) {
        const powerup = POWERUPS.find(p => p.id === type);
        if (!powerup) return;

        this.activeEffect = powerup;
        this.effectTimer = powerup.duration;
        audioManager.playSFX('powerup');

        // ─── MEJORA 8: Efecto visual al activar power-up ───
        // Los efectos visuales se aplican desde el game loop donde tenemos acceso al renderer
    }

    deactivate() {
        this.activeEffect = null;
        this.effectTimer = 0;
    }

    /**
     * Consume el efecto de escudo cuando el golpe fue absorbido.
     * Sin esto, el efecto 'shield' seguia activo y re-armaba el escudo
     * cada frame (escudo infinito).
     */
    consumeShieldEffect() {
        if (this.activeEffect && this.activeEffect.effect === 'shield') {
            this.deactivate();
        }
    }

    // ─── MEJORA 8: Método para obtener el color del efecto activo ───
    getActiveEffectColor() {
        if (!this.activeEffect) return null;
        return this.activeEffect.color;
    }

    getActiveEffectType() {
        if (!this.activeEffect) return null;
        return this.activeEffect.id;
    }

    // ─── Actualización ───

    update(dt, gameSpeed) {
        // Mover items en pantalla
        for (const item of this.activeItems) {
            item.x -= gameSpeed * dt;
            item.bobOffset += dt * 3;
        }

        // Limpiar items fuera de pantalla
        this.activeItems = this.activeItems.filter(i => i.x > -50 && !i.collected);

        // Timer de efecto activo
        if (this.activeEffect && this.activeEffect.duration > 0) {
            this.effectTimer -= dt;
            if (this.effectTimer <= 0) {
                this.deactivate();
            }
        }

        // Spawn
        this.updateSpawn(dt);
    }

    // ─── Colisión ───

    checkCollision(player) {
        const pBox = player.getHitbox();
        for (const item of this.activeItems) {
            if (item.collected) continue;
            const iBox = { x: item.x, y: item.y, w: item.w, h: item.h };
            if (rectCollision(pBox, iBox)) {
                item.collected = true;
                this.activate(item.data.id);
                return item.data;
            }
        }
        return null;
    }

    // ─── Consultas ───

    hasEffect(effect) {
        return this.activeEffect && this.activeEffect.effect === effect;
    }

    getEffectTimeLeft() {
        if (!this.activeEffect) return 0;
        return this.effectTimer;
    }

    // ─── Dibujo ───

    draw(ctx) {
        for (const item of this.activeItems) {
            if (item.collected) continue;
            const bobY = Math.sin(item.bobOffset) * 6;
            this.drawPowerupItem(ctx, item.x, item.y + bobY, item.w, item.h, item.data);
        }
    }

    drawPowerupItem(ctx, x, y, w, h, data) {
        ctx.save();

        // Brillo exterior
        ctx.shadowColor = data.color;
        ctx.shadowBlur = 15;

        // Círculo principal
        ctx.fillStyle = data.color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        ctx.fill();

        // Borde brillante
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Icono vectorial por tipo
        this.drawPowerupIcon(ctx, data.id, x + w / 2, y + h / 2, w * 0.32);

        ctx.restore();
    }

    // ─── Iconos vectoriales de power-ups (sin letras ni emojis) ───
    drawPowerupIcon(ctx, id, cx, cy, r) {
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        switch (id) {
            case 'ruana': {
                // Poncho: rombo con cuello
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx + r, cy + r * 0.5);
                ctx.lineTo(cx, cy + r);
                ctx.lineTo(cx - r, cy + r * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.arc(cx, cy - r * 0.55, r * 0.28, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'cocido': {
                // Plato hondo con vapor
                ctx.beginPath();
                ctx.arc(cx, cy + r * 0.15, r, Math.PI, 0, true);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx - r * 0.4, cy - r * 0.15);
                ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 0.6, cx - r * 0.3, cy - r);
                ctx.moveTo(cx + r * 0.3, cy - r * 0.15);
                ctx.quadraticCurveTo(cx + r * 0.1, cy - r * 0.6, cx + r * 0.4, cy - r);
                ctx.stroke();
                break;
            }
            case 'panela': {
                // Taza humeante
                ctx.fillRect(cx - r * 0.7, cy - r * 0.3, r * 1.4, r * 1.1);
                ctx.beginPath();
                ctx.arc(cx + r * 0.85, cy + 0.15 * r, r * 0.35, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - r * 0.2, cy - r * 0.5);
                ctx.quadraticCurveTo(cx - r * 0.4, cy - r * 0.85, cx - r * 0.1, cy - r * 1.1);
                ctx.stroke();
                break;
            }
            case 'queso': {
                // Cuña de queso con ojos
                ctx.beginPath();
                ctx.moveTo(cx - r, cy + r * 0.6);
                ctx.lineTo(cx + r, cy + r * 0.6);
                ctx.lineTo(cx + r * 0.6, cy - r * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(cx - r * 0.1, cy + r * 0.2, r * 0.15, 0, Math.PI * 2);
                ctx.arc(cx + r * 0.4, cy + r * 0.35, r * 0.12, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'carranga': {
                // Guitarra campesina (tiple)
                ctx.beginPath();
                ctx.arc(cx - r * 0.2, cy + r * 0.35, r * 0.55, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = r * 0.28;
                ctx.beginPath();
                ctx.moveTo(cx - r * 0.05, cy + r * 0.1);
                ctx.lineTo(cx + r * 0.85, cy - r * 0.8);
                ctx.stroke();
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath();
                ctx.arc(cx - r * 0.2, cy + r * 0.35, r * 0.18, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
        ctx.restore();
    }

    // ─── HUD ───

    drawHUD(ctx, x, y) {
        if (!this.activeEffect) return;
        const p = this.activeEffect;
        const barW = 150;
        const barH = 24;

        ctx.save();

        // Fondo
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, x, y, barW, barH, 6);
        ctx.fill();

        // Barra de tiempo
        if (p.duration > 0) {
            const ratio = this.effectTimer / p.duration;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.8;
            roundRect(ctx, x + 2, y + 2, (barW - 4) * ratio, barH - 4, 4);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Texto
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, x + 6, y + barH / 2 + 1);

        // Timer
        if (p.duration > 0) {
            ctx.textAlign = 'right';
            ctx.fillText(Math.ceil(this.effectTimer) + 's', x + barW - 6, y + barH / 2 + 1);
        }

        ctx.restore();
    }

    // ─── Reset ───

    reset() {
        this.activeItems = [];
        this.activeEffect = null;
        this.effectTimer = 0;
        this.spawnTimer = 0;
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
    }
}
