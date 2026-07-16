/**
 * zones.js - Sistema de 5 zonas del Altiplano
 * Semillas de Iguaque: Run del Altiplano
 */

const ZONES = [
    {
        id: 0,
        name: 'Páramo de Iguaque',
        bgColorTop: '#87CEEB',
        bgColorBottom: '#B0D4E8',
        groundColor: '#4A6741',
        groundDetail: '#3d5637',
        obstacleColors: ['#5D4E37', '#6B5B45', '#4A6741'],
        obstacles: ['ground', 'air', 'pit'],
        groundTypes: ['frailejon', 'rock', 'bush'],
        decorationColor: '#8FBC8F',
        starCount: 0
    },
    {
        id: 1,
        name: 'Valle de Ráquira',
        bgColorTop: '#87CEEB',
        bgColorBottom: '#F5DEB3',
        groundColor: '#C4956A',
        groundDetail: '#a87d56',
        obstacleColors: ['#8B6914', '#A0522D', '#CD853F'],
        obstacles: ['ground', 'ground', 'air'],
        groundTypes: ['tinaja', 'fence', 'rock'],
        decorationColor: '#D2B48C',
        starCount: 0
    },
    {
        id: 2,
        name: 'Tunja Colonial',
        bgColorTop: '#778899',
        bgColorBottom: '#B8B8B8',
        groundColor: '#8B7D6B',
        groundDetail: '#6e6354',
        obstacleColors: ['#696969', '#808080', '#A9A9A9'],
        obstacles: ['ground', 'air', 'air'],
        groundTypes: ['pillar', 'fence', 'rock'],
        decorationColor: '#A9A9A9',
        starCount: 0
    },
    {
        id: 3,
        name: 'Puente de Boyacá',
        bgColorTop: '#4682B4',
        bgColorBottom: '#87CEFA',
        groundColor: '#1E5F74',
        groundDetail: '#164a5a',
        obstacleColors: ['#2F4F4F', '#556B2F', '#8B4513'],
        obstacles: ['ground', 'pit', 'pit'],
        groundTypes: ['canon', 'rock', 'stump'],
        decorationColor: '#5F9EA0',
        starCount: 5
    },
    {
        id: 4,
        name: 'Villa de Leyva',
        bgColorTop: '#FFD700',
        bgColorBottom: '#FFE4B5',
        groundColor: '#D4853C',
        groundDetail: '#b06d2e',
        obstacleColors: ['#8B4513', '#A0522D', '#D2691E'],
        obstacles: ['ground', 'air', 'ground'],
        groundTypes: ['maceta', 'tinaja', 'bush'],
        decorationColor: '#DEB887',
        starCount: 10
    }
];

const ZONE_LENGTH = 500; // metros por zona

function getZoneByDistance(distance) {
    const idx = Math.floor(distance / ZONE_LENGTH) % ZONES.length;
    return ZONES[idx];
}

function getZoneTransition(zone1, zone2) {
    // Retorna factor de mezcla entre dos zonas (0-1)
    return 0.5;
}

function getZoneObstacles(zone) {
    return zone ? zone.obstacles : ['ground'];
}

// ─── Dibujo de fondo con parallax ───

function drawBackground(ctx, zone, parallaxOffset, width, height) {
    if (!zone) zone = ZONES[0];

    // Cielo gradiente
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, zone.bgColorTop);
    grad.addColorStop(1, zone.bgColorBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Estrellas/astros (zonas nocturnas/finales)
    if (zone.starCount > 0) {
        ctx.fillStyle = '#FFF8DC';
        for (let i = 0; i < zone.starCount * 3; i++) {
            const sx = ((i * 137.5 + parallaxOffset * 0.02) % width);
            const sy = ((i * 73.2) % (height * 0.4));
            const ss = 1 + (i % 3);
            ctx.beginPath();
            ctx.arc(sx, sy, ss, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ─── Capa 1: Montañas lejanas ───
    drawMountains(ctx, width, height, parallaxOffset * 0.05, zone, 0.3);

    // ─── Capa 2: Colinas ───
    drawHills(ctx, width, height, parallaxOffset * 0.15, zone, 0.5);

    // ─── Capa 3: Árboles/decoraciones ───
    drawTrees(ctx, width, height, parallaxOffset * 0.35, zone, 0.7);
}

function drawMountains(ctx, w, h, offset, zone, heightFactor) {
    ctx.fillStyle = colorWithAlpha(zone.groundColor, 0.25);
    const baseY = h - 120;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 50; x += 30) {
        const nx = x + offset % 200;
        const ny = baseY - Math.sin(nx * 0.008) * 60 * heightFactor
                   - Math.sin(nx * 0.003) * 40 * heightFactor;
        ctx.lineTo(x, ny);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
}

function drawHills(ctx, w, h, offset, zone, heightFactor) {
    ctx.fillStyle = colorWithAlpha(zone.groundColor, 0.45);
    const baseY = h - 90;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 50; x += 20) {
        const nx = x + offset % 300;
        const ny = baseY - Math.sin(nx * 0.012) * 35 * heightFactor
                   - Math.sin(nx * 0.005 + 1) * 25 * heightFactor;
        ctx.lineTo(x, ny);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
}

function drawTrees(ctx, w, h, offset, zone, heightFactor) {
    ctx.fillStyle = colorWithAlpha(zone.decorationColor, 0.6);
    const baseY = h - 70;
    const spacing = 80;
    const startX = -(offset % spacing);
    for (let x = startX; x < w + spacing; x += spacing) {
        const treeH = 25 + Math.sin(x * 0.7) * 15;
        // Tronco
        ctx.fillStyle = colorWithAlpha(zone.groundDetail, 0.7);
        ctx.fillRect(x + 8, baseY - treeH * 0.3, 6, treeH * 0.3);
        // Copa
        ctx.fillStyle = colorWithAlpha(zone.decorationColor, 0.6);
        ctx.beginPath();
        ctx.arc(x + 11, baseY - treeH * 0.4, treeH * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Dibujo del suelo ───

function drawGround(ctx, zone, width, height, parallaxOffset) {
    if (!zone) zone = ZONES[0];
    const groundY = height - 80;
    const groundH = 80;

    // Suelo principal
    ctx.fillStyle = zone.groundColor;
    ctx.fillRect(0, groundY, width, groundH);

    // Detalle del suelo (líneas de textura verticales)
    ctx.fillStyle = zone.groundDetail;
    const lineSpacing = 40;
    const off = parallaxOffset % lineSpacing;
    for (let x = -off; x < width + lineSpacing; x += lineSpacing) {
        ctx.fillRect(x, groundY + 5, 2, groundH - 10);
    }

    // ─── Mejora: Patrón de suelo texturizado ───
    // Líneas horizontales de detalle (terreno)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 6; i++) {
        const lineY = groundY + 8 + i * 12;
        ctx.fillRect(0, lineY, width, 1);
    }

    // Rocas/pequeños detalles en el suelo
    for (let i = 0; i < 15; i++) {
        const rx = ((parallaxOffset * 0.5 + i * 137) % (width + 60)) - 30;
        const ry = groundY + 5 + (i * 17) % (groundH - 15);
        const rw = 6 + (i * 7) % 8;
        const rh = 2 + (i * 3) % 3;
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pequeñas piedras dispersas
    for (let i = 0; i < 8; i++) {
        const sx = ((parallaxOffset * 0.3 + i * 213 + 50) % (width + 40)) - 20;
        const sy = groundY + 15 + (i * 23) % (groundH - 25);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 3 + (i % 4), 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Hierba/pasto en el borde superior
    ctx.fillStyle = colorWithAlpha(zone.decorationColor, 0.5);
    for (let x = -off; x < width + 20; x += 15) {
        const grassH = 4 + Math.sin(x * 0.5) * 3;
        ctx.fillRect(x, groundY - grassH, 3, grassH);
    }

    return groundY;
}

// ─── Transición entre zonas ───

function drawTransitionOverlay(ctx, progress, width, height, fromZone, toZone) {
    const alpha = Math.sin(progress * Math.PI);
    ctx.fillStyle = colorWithAlpha(fromZone ? fromZone.bgColorTop : '#000', alpha * 0.3);
    ctx.fillRect(0, 0, width, height);
}

// ─── MEJORA 7: Dibujo de obstáculos con forma ───

function drawObstacle(ctx, type, x, y, w, h) {
    switch (type) {
        case 'frailejon':
            // Tallo
            ctx.fillStyle = '#4d6b44';
            ctx.fillRect(x + w / 2 - 4, y, 8, h);
            // Roseta
            ctx.fillStyle = '#5a7d52';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y, w / 2, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Detalle roseta
            ctx.fillStyle = '#6b8f62';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y - 2, w / 3, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'rock':
            ctx.fillStyle = '#7a7a7a';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Detalle
            ctx.fillStyle = '#8a8a8a';
            ctx.beginPath();
            ctx.ellipse(x + w / 2 - 5, y + h / 2 - 3, w / 3, h / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Brillo
            ctx.fillStyle = '#9a9a9a';
            ctx.beginPath();
            ctx.ellipse(x + w / 2 + 3, y + h / 2 + 2, w / 5, h / 5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'tinaja':
            ctx.fillStyle = '#A0522D';
            ctx.beginPath();
            ctx.moveTo(x + w * 0.2, y + h);
            ctx.quadraticCurveTo(x, y + h * 0.5, x + w * 0.2, y + h * 0.2);
            ctx.lineTo(x + w * 0.8, y + h * 0.2);
            ctx.quadraticCurveTo(x + w, y + h * 0.5, x + w * 0.8, y + h);
            ctx.fill();
            // Boca de la tinaja
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.12);
            // Detalle
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.6, w * 0.2, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'stump':
            // Tronco
            ctx.fillStyle = '#6B4226';
            ctx.fillRect(x + 5, y + 10, w - 10, h - 10);
            // Anillos del tronco
            ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + 10, (w - 10) / 2, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(160, 110, 60, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + 10, (w - 10) / 3, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'bush':
            ctx.fillStyle = '#4d6b44';
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5a7d52';
            ctx.beginPath();
            ctx.arc(x + w / 2 - 5, y + h / 2 - 5, w / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3d563d';
            ctx.beginPath();
            ctx.arc(x + w / 2 + 6, y + h / 2 + 3, w / 4, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'maceta': {
            // Maceta de barro con planta (Villa de Leyva)
            ctx.fillStyle = '#B0603A';
            ctx.beginPath();
            ctx.moveTo(x + w * 0.12, y + h * 0.4);
            ctx.lineTo(x + w * 0.88, y + h * 0.4);
            ctx.lineTo(x + w * 0.75, y + h);
            ctx.lineTo(x + w * 0.25, y + h);
            ctx.closePath();
            ctx.fill();
            // Borde superior
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + w * 0.06, y + h * 0.34, w * 0.88, h * 0.12);
            // Planta
            ctx.fillStyle = '#4A6741';
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h * 0.2, w * 0.28, 0, Math.PI * 2);
            ctx.arc(x + w * 0.3, y + h * 0.3, w * 0.2, 0, Math.PI * 2);
            ctx.arc(x + w * 0.7, y + h * 0.3, w * 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Flores
            ctx.fillStyle = '#C74B50';
            ctx.beginPath();
            ctx.arc(x + w * 0.38, y + h * 0.18, 3, 0, Math.PI * 2);
            ctx.arc(x + w * 0.62, y + h * 0.24, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'canon': {
            // Cañón de la Batalla de Boyacá
            const wheelR = h * 0.3;
            const wheelY = y + h - wheelR;
            // Tubo
            ctx.save();
            ctx.translate(x + w * 0.35, y + h * 0.45);
            ctx.rotate(-0.35);
            ctx.fillStyle = '#2F4F4F';
            ctx.fillRect(0, -h * 0.11, w * 0.72, h * 0.22);
            // Boca
            ctx.fillStyle = '#1e3535';
            ctx.fillRect(w * 0.66, -h * 0.13, w * 0.1, h * 0.26);
            ctx.restore();
            // Rueda
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            ctx.arc(x + w * 0.4, wheelY, wheelR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Rayos de la rueda
            ctx.strokeStyle = '#8D6E63';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const a = (Math.PI / 4) * i;
                ctx.beginPath();
                ctx.moveTo(x + w * 0.4 - Math.cos(a) * wheelR * 0.8, wheelY - Math.sin(a) * wheelR * 0.8);
                ctx.lineTo(x + w * 0.4 + Math.cos(a) * wheelR * 0.8, wheelY + Math.sin(a) * wheelR * 0.8);
                ctx.stroke();
            }
            break;
        }
        case 'pillar': {
            // Columna colonial de piedra (Tunja)
            ctx.fillStyle = '#9E9689';
            ctx.fillRect(x + w * 0.2, y + h * 0.12, w * 0.6, h * 0.88);
            // Capitel y base
            ctx.fillStyle = '#B5AC9D';
            ctx.fillRect(x + w * 0.05, y, w * 0.9, h * 0.14);
            ctx.fillRect(x + w * 0.05, y + h * 0.88, w * 0.9, h * 0.12);
            // Estrías
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 2;
            for (let i = 1; i <= 2; i++) {
                const lx = x + w * 0.2 + (w * 0.6 / 3) * i;
                ctx.beginPath();
                ctx.moveTo(lx, y + h * 0.16);
                ctx.lineTo(lx, y + h * 0.86);
                ctx.stroke();
            }
            break;
        }
        case 'fence': {
            // Cerca de madera campesina
            ctx.fillStyle = '#7B5B3A';
            // Postes
            ctx.fillRect(x + w * 0.08, y, w * 0.13, h);
            ctx.fillRect(x + w * 0.78, y, w * 0.13, h);
            // Travesaños
            ctx.fillStyle = '#8D6E4E';
            ctx.fillRect(x, y + h * 0.2, w, h * 0.14);
            ctx.fillRect(x, y + h * 0.58, w, h * 0.14);
            // Vetas
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + h * 0.27);
            ctx.lineTo(x + w - 4, y + h * 0.27);
            ctx.moveTo(x + 4, y + h * 0.65);
            ctx.lineTo(x + w - 4, y + h * 0.65);
            ctx.stroke();
            break;
        }
        default:
            // Fallback a rectángulo
            ctx.fillStyle = '#666';
            ctx.fillRect(x, y, w, h);
    }
}

// ─── Obstáculo aéreo: colgante tejido (deslizarse por debajo) ───
// Se dibuja desde y (arriba) hasta y+h (borde inferior, a la altura de agacharse)

function drawHangingObstacle(ctx, x, y, w, h, time) {
    ctx.save();
    // Cuerda corta que se desvanece hacia arriba
    const ropeTop = Math.max(0, y - 110);
    const ropeGrad = ctx.createLinearGradient(0, ropeTop, 0, y);
    ropeGrad.addColorStop(0, 'rgba(60,45,30,0)');
    ropeGrad.addColorStop(1, 'rgba(60,45,30,0.85)');
    ctx.strokeStyle = ropeGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, ropeTop);
    ctx.lineTo(x + w / 2, y + 4);
    ctx.stroke();

    // Travesaño de madera
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(x - 4, y, w + 8, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x - 4, y, w + 8, 3);

    // Tiras tejidas colgando (colores de ruana)
    const colors = ['#8B2500', '#B5651D', '#6B1D00', '#994D26'];
    const strips = Math.max(3, Math.floor(w / 12));
    const stripW = w / strips;
    const sway = Math.sin((time || 0) * 2) * 3;
    for (let i = 0; i < strips; i++) {
        ctx.fillStyle = colors[i % colors.length];
        const sx = x + i * stripW;
        const bottomSway = sway * (i % 2 === 0 ? 1 : -0.6);
        ctx.beginPath();
        ctx.moveTo(sx + 1, y + 8);
        ctx.lineTo(sx + stripW - 1, y + 8);
        ctx.lineTo(sx + stripW - 1 + bottomSway, y + h - 6);
        ctx.lineTo(sx + 1 + bottomSway, y + h);
        ctx.closePath();
        ctx.fill();
    }
    // Flecos dorados al borde
    ctx.fillStyle = '#C9A84C';
    for (let i = 0; i < strips; i++) {
        const sx = x + i * stripW + stripW / 2;
        const bottomSway = sway * (i % 2 === 0 ? 1 : -0.6);
        ctx.beginPath();
        ctx.arc(sx + bottomSway, y + h - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ─── Dibujo de semillas ───

function drawSeed(ctx, x, y, size, glow) {
    ctx.save();
    if (glow) {
        ctx.shadowColor = '#F4C430';
        ctx.shadowBlur = 10;
    }
    ctx.fillStyle = '#F4C430';
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brillo
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.2, y - size * 0.3, size * 0.3, size * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
