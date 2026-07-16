/**
 * player.js - Clase del jugador (Mateo)
 * Semillas de Iguaque: Run del Altiplano
 */

class Player {
    constructor(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
        // ─── MEJORA 5: Gravedad y salto ajustados para sensación más "sólida" ───
        this.GRAVITY = 1800;        // Más gravedad = caída más rápida
        this.JUMP_FORCE = -650;     // Salto más fuerte
        this.GLIDE_GRAVITY = 500;   // Planeo más lento
        this.MAX_FALL_SPEED = 800;  // Velocidad máxima de caída
        this.SLIDE_SPEED_BOOST = 50;
        this.SLIDE_DURATION = 0.4;

        // ─── MEJORA 6: Coyote time ───
        this.coyoteTime = 0;
        this.COYOTE_DURATION = 0.08; // 80ms

        // ─── MEJORA 7: Jump buffer ───
        this.jumpBuffer = 0;
        this.JUMP_BUFFER_DURATION = 0.1; // 100ms

        this.width = 50;
        this.height = 60;
        this.x = canvasWidth * 0.15;
        this.y = this.GROUND_Y - this.height;
        this.vy = 0;
        this.isGrounded = true;
        this.isGliding = false;
        this.isSliding = false;
        this.slideTimer = 0;

        // Animación
        this.runFrame = 0;
        this.runTimer = 0;
        this.blinkTimer = 0;

        // Animación de frames mejorada
        this.animTimer = 0;
        this.animFrame = 0;

        // ─── MEJORA 3: Invencibilidad post-golpe ───
        this.invincible = false;
        this.invincibleTimer = 0;

        // Power-ups
        this.hasShield = false;
        this.isInvincible = false;
        this.shieldColor = '#D4853C';
        this.ruanaBoost = false; // power-up La Ruana activo (planeo 200)

        // Ruana visual
        this.ruanaAngle = 0;
        this.ruanaWave = 0;

        // ─── Personaje seleccionado y habilidades ───
        this.character = { id: 'mateo', name: 'Mateo', color: '#4A6741' };
        this.jumpMult = 1;        // bochica: salto mas alto
        this.maxJumps = 1;        // pedro: doble salto
        this.jumpsUsed = 0;
        this.seedMult = 1;        // policarpa: semillas x2
        this.shieldRegen = false; // santander: escudo regenerativo
        this.shieldRegenTimer = 0;
        this.SHIELD_REGEN_INTERVAL = 20;
    }

    // ─── Aplicar personaje seleccionado (habilidades reales) ───
    setCharacter(def) {
        this.character = def || { id: 'mateo', name: 'Mateo', color: '#4A6741' };
        this.jumpMult = this.character.id === 'bochica' ? 1.1 : 1;
        this.maxJumps = this.character.id === 'pedro' ? 2 : 1;
        this.seedMult = this.character.id === 'policarpa' ? 2 : 1;
        this.shieldRegen = this.character.id === 'santander';
    }

    update(dt) {
        // ─── MEJORA 6: Coyote time ───
        if (this.isGrounded) {
            this.coyoteTime = this.COYOTE_DURATION;
        } else {
            this.coyoteTime -= dt;
        }

        // ─── MEJORA 7: Decay del jump buffer ───
        if (this.jumpBuffer > 0) {
            this.jumpBuffer -= dt;
        }

        // ─── MEJORA 7: Ejecutar salto si hay buffer y está en suelo (o coyote time) ───
        if (this.jumpBuffer > 0 && (this.isGrounded || this.coyoteTime > 0)) {
            this.vy = this.JUMP_FORCE * this.jumpMult;
            this.isGrounded = false;
            this.isGliding = false;
            this.coyoteTime = 0;
            this.jumpBuffer = 0;
            this.jumpsUsed = 1;
            audioManager.playSFX('jump');
        }

        // Gravedad (planeo: La Ruana 200, El Yato 180, normal 500)
        let glideGravity = this.GLIDE_GRAVITY;
        if (this.ruanaBoost) glideGravity = 200;
        if (this.character.id === 'yato') glideGravity = 180;
        const gravity = this.isGliding && !this.isGrounded ? glideGravity : this.GRAVITY;
        this.vy += gravity * dt;

        // ─── MEJORA 5: Limitar velocidad de caída ───
        if (this.vy > this.MAX_FALL_SPEED) {
            this.vy = this.MAX_FALL_SPEED;
        }

        // Movimiento vertical
        this.y += this.vy * dt;

        // Suelo
        if (this.y + this.height >= this.GROUND_Y) {
            this.y = this.GROUND_Y - this.height;
            this.vy = 0;
            this.isGrounded = true;
            this.isGliding = false;
            this.jumpsUsed = 0;
            // Al aterrizar tras una caída rápida, deslizarse automáticamente
            if (this.fastFalling) {
                this.fastFalling = false;
                this.slide();
            }
        } else {
            this.isGrounded = false;
        }

        // ─── Santander: escudo regenerativo ───
        if (this.shieldRegen && !this.hasShield) {
            this.shieldRegenTimer += dt;
            if (this.shieldRegenTimer >= this.SHIELD_REGEN_INTERVAL) {
                this.shieldRegenTimer = 0;
                this.hasShield = true;
                audioManager.playSFX('powerup');
            }
        }

        // Deslizamiento
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.height = 60;
                this.y -= 30; // Restaurar altura
            }
        }

        // Animación de correr
        this.runTimer += dt;
        if (this.runTimer > 0.1) {
            this.runTimer = 0;
            this.runFrame = (this.runFrame + 1) % 4;
        }

        // Animación de frames mejorada (para bobbing y otros efectos)
        this.animTimer += dt;
        if (this.animTimer > 0.15) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        // Animación de ruana
        this.ruanaWave += dt * 5;
        this.ruanaAngle = Math.sin(this.ruanaWave) * 0.2;

        // Parpadeo
        this.blinkTimer += dt;

        // ─── MEJORA 3: Actualizar invencibilidad post-golpe ───
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
    }

    // ─── Acciones ───

    jump() {
        // ─── Doble salto (Pedro Pascasio) ───
        if (!this.isGrounded && this.coyoteTime <= 0 &&
            this.jumpsUsed >= 1 && this.jumpsUsed < this.maxJumps) {
            this.vy = this.JUMP_FORCE * 0.92 * this.jumpMult;
            this.jumpsUsed++;
            this.isGliding = false;
            audioManager.playSFX('jump');
            return;
        }
        // ─── MEJORA 7: Buffer de salto ───
        // Guardar el intento de salto; se ejecutará en update() si estamos en suelo o coyote time
        this.jumpBuffer = this.JUMP_BUFFER_DURATION;
    }

    glide(active) {
        if (!this.isGrounded) {
            this.isGliding = active;
        }
    }

    slide() {
        if (this.isGrounded && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.SLIDE_DURATION;
            this.height = 30; // Mitad de altura
            this.y += 30; // Ajustar posición
            audioManager.playSFX('slide');
            return true;
        }
        // En el aire: caída rápida que termina en deslizamiento automático
        if (!this.isGrounded) {
            this.vy = Math.max(this.vy, 950);
            this.isGliding = false;
            this.fastFalling = true;
            audioManager.playSFX('slide');
            return true;
        }
        return false;
    }

    // ─── MEJORA 3: Manejo de golpe con invencibilidad post-golpe ───

    onHit() {
        if (this.invincible) return false; // Ya es invencible

        // Si tiene escudo (Cocido), consume el escudo
        if (this.hasShield) {
            this.hasShield = false;
            this.invincible = true;
            this.invincibleTimer = 2.0; // 2 segundos de invencibilidad
            audioManager.playSFX('hit');
            return false; // No muere
        }

        // Si es invencible por carranga
        if (this.isInvincible) {
            return false; // No muere
        }

        // Sin escudo: activar invencibilidad breve + daño fatal
        this.invincible = true;
        this.invincibleTimer = 1.5; // 1.5 segundos (visual antes de game over)
        return true; // Muere (game over)
    }

    // ─── Power-ups ───

    activateShield() {
        this.hasShield = true;
    }

    removeShield() {
        this.hasShield = false;
    }

    setInvincible(active) {
        this.isInvincible = active;
    }

    takeDamage() {
        // Deprecado: usar onHit() en su lugar
        // Mantenido para compatibilidad con código existente
        if (this.isInvincible) return false;
        if (this.hasShield) {
            this.hasShield = false;
            audioManager.playSFX('hit');
            return false; // Escudo absorbe
        }
        return true; // Daño real
    }

    // ─── Dibujo ───

    draw(ctx) {
        // MEJORA 6: Animación mejorada del jugador
        const bobY = Math.sin(this.animFrame * Math.PI / 2) * 2;
        const drawY = this.y + bobY;

        // a) Sombra del jugador (ovalada debajo)
        if (this.isGrounded) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(
                this.x + this.width / 2,
                this.y + this.height + 2,
                this.width / 2 * (1 - (this.y - this.GROUND_Y) / 200),
                4,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        } else {
            // Sombra más pequeña cuando está en el aire
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            const shadowScale = Math.max(0.3, 1 - (this.GROUND_Y - (this.y + this.height)) / 300);
            ctx.beginPath();
            ctx.ellipse(
                this.x + this.width / 2,
                this.GROUND_Y + 3,
                this.width / 2 * shadowScale,
                4 * shadowScale,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        }

        ctx.save();

        // b) Animación de planeo: inclinar al jugador cuando planea
        if (this.isGliding && !this.isGrounded) {
            ctx.translate(this.x + this.width / 2, drawY + this.height / 2);
            ctx.rotate(-0.15);
            ctx.translate(-(this.x + this.width / 2), -(drawY + this.height / 2));
        }

        // ─── MEJORA 3: Efecto de invencibilidad (parpadeo) ───
        if (this.invincible && Math.sin(this.blinkTimer * 20) > 0) {
            ctx.globalAlpha = 0.3;
        }
        if (this.isInvincible && Math.sin(this.ruanaWave * 8) > 0) {
            ctx.globalAlpha = 0.5;
        }

        // Efecto de escudo
        if (this.hasShield) {
            const shieldX = this.x + this.width / 2;
            const shieldY = drawY + this.height / 2;
            ctx.strokeStyle = this.shieldColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(shieldX, shieldY, this.height * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = colorWithAlpha(this.shieldColor, 0.3);
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(shieldX, shieldY, this.height * 0.75, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ─── MEJORA 3: Aura de invencibilidad post-golpe ───
        if (this.invincible && !this.isInvincible) {
            const pulse = 0.2 + Math.sin(this.blinkTimer * 10) * 0.15;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2,
                drawY + this.height / 2,
                this.height * 0.8 + Math.sin(this.blinkTimer * 5) * 3,
                0, Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
        }

        if (this.isSliding) {
            // Dibujo de deslizamiento (mateo agachado)
            this.drawBodyImproved(ctx, this.x, drawY, true, false);
        } else if (!this.isGrounded) {
            // Dibujo de salto/planeo
            this.drawBodyImproved(ctx, this.x, drawY, false, true);
        } else {
            // Dibujo de correr
            this.drawBodyImproved(ctx, this.x, drawY, false, false);
            // Piernas animadas
            this.drawLegsImproved(ctx, this.x, drawY);
        }

        ctx.restore();
    }

    // MEJORA 6: Dibujo del cuerpo mejorado
    drawBodyImproved(ctx, baseX, baseY, isSliding, isJumping) {
        const halfW = this.width / 2;

        if (isSliding) {
            // Posición agachada - dibujar con rotación
            ctx.save();
            ctx.translate(baseX + halfW, baseY + this.height / 2);
            ctx.rotate(Math.PI / 2 * 0.12);

            // Cabeza
            ctx.fillStyle = '#FDBCB4';
            ctx.beginPath();
            ctx.arc(0, -this.height / 2 + 12, 12, 0, Math.PI * 2);
            ctx.fill();

            // Ojo
            ctx.fillStyle = '#2C1810';
            ctx.beginPath();
            ctx.arc(5, -this.height / 2 + 10, 2, 0, Math.PI * 2);
            ctx.fill();

            // Sombrero vueltiao
            ctx.fillStyle = '#F4C430';
            ctx.fillRect(-14, -this.height / 2 - 2, 28, 6);
            ctx.fillRect(-8, -this.height / 2 - 6, 16, 6);

            // Cuerpo (color del personaje)
            ctx.fillStyle = this.character.color || '#4A6741';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ruana extendida hacia atrás
            ctx.fillStyle = '#8B2500';
            ctx.beginPath();
            ctx.moveTo(-14, -10);
            ctx.lineTo(-35, -5 + Math.sin(this.ruanaWave) * 3);
            ctx.lineTo(-30, 10);
            ctx.lineTo(-14, 10);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
            return;
        }

        // ─── Cabeza ───
        ctx.fillStyle = '#FDBCB4'; // Piel
        ctx.beginPath();
        ctx.arc(baseX + halfW, baseY + 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // Ojos
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(baseX + halfW + 4, baseY + 10, 2, 0, Math.PI * 2);
        ctx.fill();

        // Cabello
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(baseX + halfW, baseY + 8, 13, Math.PI, Math.PI * 2);
        ctx.fill();

        // Cabello largo (Policarpa)
        if (this.character.id === 'policarpa') {
            ctx.fillStyle = '#2C1810';
            ctx.beginPath();
            ctx.ellipse(baseX + halfW - 11, baseY + 18, 4, 10, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sombrero vueltiao (simplificado)
        ctx.fillStyle = '#F4C430';
        ctx.fillRect(baseX + halfW - 14, baseY - 2, 28, 6);
        ctx.fillRect(baseX + halfW - 8, baseY - 6, 16, 6);

        // ─── Cuerpo (ruana con el color del personaje) - forma elíptica ───
        const bodyColor = this.character.color || '#4A6741';
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(baseX + halfW, baseY + 30, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ruana (detalle a los lados, tono mas oscuro)
        ctx.fillStyle = shadeColor(bodyColor, 0.75);
        ctx.fillRect(baseX + halfW - 16, baseY + 22, 8, 16);
        ctx.fillRect(baseX + halfW + 8, baseY + 22, 8, 16);

        // Franja de la ruana
        ctx.fillStyle = shadeColor(bodyColor, 1.3);
        ctx.fillRect(baseX + halfW - 12, baseY + 26, 24, 3);

        if (isJumping && this.isGliding) {
            // Ruana extendida al planear
            ctx.fillStyle = '#8B2500';
            ctx.beginPath();
            ctx.moveTo(baseX + halfW - 14, baseY + 22);
            ctx.lineTo(baseX + halfW - 35, baseY + 28 + Math.sin(this.ruanaWave * 2) * 6);
            ctx.lineTo(baseX + halfW - 28, baseY + 48);
            ctx.lineTo(baseX + halfW - 14, baseY + 42);
            ctx.closePath();
            ctx.fill();

            // Líneas de la ruana
            ctx.strokeStyle = '#6B1D00';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(baseX + halfW - 14, baseY + 26 + i * 8);
                ctx.lineTo(baseX + halfW - 32, baseY + 30 + i * 7 + Math.sin(this.ruanaWave * 2 + i) * 4);
                ctx.stroke();
            }
        }
    }

    // MEJORA 6: Piernas animadas
    drawLegsImproved(ctx, baseX, baseY) {
        const halfW = this.width / 2;
        const legOffset = Math.sin(this.animFrame * Math.PI / 2) * 6;

        ctx.fillStyle = '#2F4F4F';
        // Pierna izquierda
        ctx.fillRect(baseX + halfW - 8 + legOffset, baseY + 42, 6, 12);
        // Pierna derecha
        ctx.fillRect(baseX + halfW + 2 - legOffset, baseY + 42, 6, 12);

        // Zapatos
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(baseX + halfW - 10 + legOffset, baseY + 52, 8, 4);
        ctx.fillRect(baseX + halfW - legOffset, baseY + 52, 8, 4);
    }

    // ─── Hitbox ───

    getHitbox() {
        // Hitbox reducida para ser justo
        const shrink = 8;
        return {
            x: this.x + shrink,
            y: this.y + shrink,
            w: this.width - shrink * 2,
            h: this.height - shrink * 2
        };
    }

    getSeedMagnetHitbox() {
        const radius = 120;
        return {
            x: this.x + this.width / 2 - radius,
            y: this.y + this.height / 2 - radius,
            w: radius * 2,
            h: radius * 2
        };
    }

    // ─── Reset ───

    reset() {
        this.y = this.GROUND_Y - this.height;
        this.vy = 0;
        this.isGrounded = true;
        this.isGliding = false;
        this.isSliding = false;
        this.slideTimer = 0;
        this.height = 60;
        this.hasShield = false;
        this.isInvincible = false;
        this.runFrame = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        // ─── MEJORA 3: Reset invencibilidad ───
        this.invincible = false;
        this.invincibleTimer = 0;
        // ─── MEJORA 6: Reset coyote time ───
        this.coyoteTime = 0;
        // ─── MEJORA 7: Reset jump buffer ───
        this.jumpBuffer = 0;
        // ─── Reset habilidades de personaje ───
        this.jumpsUsed = 0;
        this.shieldRegenTimer = 0;
        this.ruanaBoost = false;
        this.fastFalling = false;
        if (this.shieldRegen) {
            this.hasShield = true; // Santander empieza con escudo
        }
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
        this.x = canvasWidth * 0.15;
        if (this.isGrounded) {
            this.y = this.GROUND_Y - this.height;
        }
    }
}
