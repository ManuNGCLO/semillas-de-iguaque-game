/**
 * utils.js - Utilidades generales para el juego
 * Semillas de Iguaque: Run del Altiplano
 */

// ─── Manifiesto de assets (cargado por main.js en loadAssets) ───
// Las claves bg0-bg4 corresponden a los ids de zona en zones.js.
var assets = {
    images: {
        bg0: 'assets/images/bg_paramo.jpg',
        bg1: 'assets/images/bg_raquira.jpg',
        bg2: 'assets/images/bg_tunja.jpg',
        bg3: 'assets/images/bg_puente.jpg',
        bg4: 'assets/images/bg_villa.jpg'
    }
};

function getZoneBgImage(zoneId) {
    const img = assets['bg' + zoneId];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

// ─── Paleta de diseño (tierra boyacense) ───
const PALETTE = {
    ink: '#1a1a2e',        // fondo oscuro / texto sobre claro
    panel: '#2a2a3e',      // paneles de UI
    cream: '#f0e6d2',      // texto principal sobre oscuro
    gold: '#F4C430',       // semillas, acentos
    terracotta: '#D4853C', // CTA, bordes
    terracottaDark: '#b06d2e',
    green: '#4A6741',      // botón jugar, páramo
    greenDark: '#3d5637',
    red: '#8B2500',        // ruana
    blue: '#1E5F74',
    muted: '#a89f8d'       // texto secundario (contraste AA sobre ink)
};

// ─── Funciones matemáticas ───

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function rectCollision(r1, r2) {
    return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
    );
}

// ─── Dibujo de texto ───

function drawText(ctx, text, x, y, size, color, align, font) {
    ctx.save();
    ctx.font = (font ? font + ' ' : 'bold ') + size + 'px Georgia, serif';
    ctx.fillStyle = color;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawTextStroke(ctx, text, x, y, size, color, strokeColor, align) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px Georgia, serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = strokeColor || '#000';
    ctx.lineWidth = size * 0.08;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

// ─── Clase Partícula ───

class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size || 4;
        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ─── Sistema de partículas ───

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, color, speed, life, size) {
        for (let i = 0; i < count; i++) {
            const angle = random(0, Math.PI * 2);
            const spd = random(speed * 0.3, speed);
            const vx = Math.cos(angle) * spd;
            const vy = Math.sin(angle) * spd;
            this.particles.push(
                new Particle(
                    x, y, vx, vy,
                    random(life * 0.5, life * 1.5),
                    color,
                    random(size * 0.5, size * 1.5)
                )
            );
        }
    }

    emitBurst(x, y, count, colors, speed, life, size) {
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = random(0, Math.PI * 2);
            const spd = random(speed * 0.3, speed);
            const vx = Math.cos(angle) * spd;
            const vy = Math.sin(angle) * spd;
            this.particles.push(
                new Particle(
                    x, y, vx, vy,
                    random(life * 0.5, life * 1.5),
                    color,
                    random(size * 0.5, size * 1.5)
                )
            );
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].active) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    clear() {
        this.particles = [];
    }
}

// ─── Clase Capa de Parallax ───

class ParallaxLayer {
    constructor(speed, color, yOffset, height, drawFunc) {
        this.speed = speed;
        this.color = color;
        this.yOffset = yOffset;
        this.height = height;
        this.drawFunc = drawFunc;
        this.offset = 0;
    }

    update(dt, gameSpeed) {
        this.offset += this.speed * gameSpeed * dt * 0.1;
        if (this.offset > 1000) this.offset -= 1000;
    }

    draw(ctx, width, height, zone) {
        const y = height - this.yOffset;
        if (this.drawFunc) {
            this.drawFunc(ctx, width, height, this.offset, y, zone, this.color);
        } else {
            // Dibujo por defecto: formas simples
            ctx.fillStyle = this.color;
            ctx.fillRect(0, y, width, this.height);
        }
    }
}

// ─── Helpers de canvas ───

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ─── Utilidades de color ───

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function colorWithAlpha(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

// Oscurece (factor < 1) o aclara (factor > 1) un color hex
function shadeColor(hex, factor) {
    const rgb = hexToRgb(hex);
    const r = clamp(Math.round(rgb.r * factor), 0, 255);
    const g = clamp(Math.round(rgb.g * factor), 0, 255);
    const b = clamp(Math.round(rgb.b * factor), 0, 255);
    return `rgb(${r},${g},${b})`;
}

// ─── Easing functions ───

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInQuad(t) {
    return t * t;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
