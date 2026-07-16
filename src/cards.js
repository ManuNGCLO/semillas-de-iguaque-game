/**
 * cards.js - Sistema de tarjetas culturales
 * Semillas de Iguaque: Run del Altiplano
 */

let cardsDatabase = [];
let currentPopupCard = null;
let popupTimer = 0;
const POPUP_DURATION = 4;

// ─── Carga de datos ───

function loadCardsDatabase(data) {
    if (data && data.tarjetas) {
        cardsDatabase = data.tarjetas;
    }
}

function getCardById(id) {
    return cardsDatabase.find(c => c.id === id);
}

function getRandomCard(zone) {
    const available = cardsDatabase.filter(c => {
        return c.zona === zone && !hasCard(c.id);
    });
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}

function getUnlockedCards() {
    const ids = getCards();
    return ids.map(id => getCardById(id)).filter(c => c !== undefined);
}

function getCardCount() {
    return getCards().length;
}

function getTotalCards() {
    return cardsDatabase.length;
}

// ─── Desbloqueo ───

function tryUnlockCard(zone) {
    const card = getRandomCard(zone);
    if (card && unlockCard(card.id)) {
        showCardPopup(card);
        return card;
    }
    return null;
}

// ─── Popup de tarjeta ───

function showCardPopup(card) {
    currentPopupCard = card;
    popupTimer = POPUP_DURATION;
}

function updateCardPopup(dt) {
    if (popupTimer > 0) {
        popupTimer -= dt;
        if (popupTimer <= 0) {
            currentPopupCard = null;
        }
    }
}

function drawCardPopup(ctx, w, h) {
    if (!currentPopupCard) return;
    const alpha = clamp(popupTimer, 0, 1);
    const cardW = Math.min(500, w * 0.85);
    const cardH = 280;
    const x = (w - cardW) / 2;
    const y = (h - cardH) / 2;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Fondo oscuro
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    // Tarjeta
    roundRect(ctx, x, y, cardW, cardH, 16);
    ctx.fillStyle = '#2a2a3e';
    ctx.fill();
    ctx.strokeStyle = '#D4853C';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Categoría
    drawTextStroke(ctx, currentPopupCard.categoria.toUpperCase(), x + cardW / 2, y + 30, 14, '#D4853C', '#000', 'center');

    // Título
    drawTextStroke(ctx, currentPopupCard.titulo, x + cardW / 2, y + 65, 22, '#f0e6d2', '#000', 'center');

    // Texto
    ctx.fillStyle = '#e0d5c0';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'left';
    wrapText(ctx, currentPopupCard.texto, x + 20, y + 100, cardW - 40, 20);

    // Dato curioso
    const datoY = y + cardH - 55;
    ctx.fillStyle = '#F4C430';
    ctx.font = 'italic 12px Georgia, serif';
    ctx.textAlign = 'left';
    wrapText(ctx, 'Dato: ' + currentPopupCard.dato_curioso, x + 20, datoY, cardW - 40, 18);

    // Botón continuar
    const btnY = y + cardH - 25;
    drawText(ctx, 'Toca para continuar', x + cardW / 2, btnY, 12, '#888', 'center');

    ctx.restore();
}

// ─── Galería de tarjetas ───

let cardScrollOffset = 0;
let cardScrollTarget = 0;
let selectedGalleryCard = null;
let galleryLayout = { startY: 110, margin: 15, cardW: 0, cardH: 0, cols: 3 };

// Desplaza la galería (llamado desde input: drag táctil o rueda del mouse)
function scrollCards(dy) {
    cardScrollTarget += dy;
}

function resetGallery() {
    selectedGalleryCard = null;
}

function drawCardCollection(ctx, w, h) {
    const unlockedIds = getCards();
    const total = getTotalCards();
    const margin = galleryLayout.margin;
    const cols = galleryLayout.cols;
    const cardW = (w - margin * (cols + 1)) / cols;
    const cardH = cardW * 1.35;
    galleryLayout.cardW = cardW;
    galleryLayout.cardH = cardH;
    const startY = galleryLayout.startY;
    const rows = Math.ceil(total / cols);
    const contentHeight = rows * (cardH + margin) + margin;

    // Fondo
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Título
    drawTextStroke(ctx, 'GALERIA DE TARJETAS', w / 2, 50, 26, '#f0e6d2', '#D4853C', 'center');
    drawText(ctx, unlockedIds.length + ' / ' + total + ' desbloqueadas', w / 2, 82, 14, '#a89f8d', 'center');

    // Scroll con inercia suave
    const minScroll = Math.min(0, -(contentHeight - (h - startY - 90)));
    cardScrollTarget = clamp(cardScrollTarget, minScroll, 0);
    cardScrollOffset = lerp(cardScrollOffset, cardScrollTarget, 0.18);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY - 10, w, h - startY - 70);
    ctx.clip();

    const zoneNames = ['Páramo', 'Ráquira', 'Tunja', 'Puente', 'Villa'];

    for (let i = 0; i < cardsDatabase.length; i++) {
        const card = cardsDatabase[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = margin + col * (cardW + margin);
        const cy = startY + row * (cardH + margin) + cardScrollOffset;

        if (cy + cardH < startY - 20 || cy > h) continue;

        const isUnlocked = unlockedIds.includes(card.id);

        // Fondo tarjeta
        roundRect(ctx, cx, cy, cardW, cardH, 8);
        ctx.fillStyle = isUnlocked ? '#2a2a3e' : '#20202e';
        ctx.fill();
        ctx.strokeStyle = isUnlocked ? '#D4853C' : '#3a3a48';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isUnlocked) {
            // Categoría
            ctx.fillStyle = '#D4853C';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText((card.categoria || '').toUpperCase(), cx + cardW / 2, cy + 16);

            // Título
            ctx.fillStyle = '#f0e6d2';
            ctx.font = 'bold 11px Georgia';
            wrapText(ctx, card.titulo, cx + cardW / 2, cy + 36, cardW - 10, 14);

            // Zona
            ctx.fillStyle = '#888';
            ctx.font = '9px Arial';
            ctx.fillText(zoneNames[card.zona] || '', cx + cardW / 2, cy + cardH - 10);
        } else {
            // Tarjeta bloqueada
            ctx.fillStyle = '#4a4a58';
            ctx.font = 'bold 20px Georgia';
            ctx.textAlign = 'center';
            ctx.fillText('???', cx + cardW / 2, cy + cardH / 2);
            ctx.fillStyle = '#555';
            ctx.font = '9px Arial';
            ctx.fillText(zoneNames[card.zona] || '', cx + cardW / 2, cy + cardH - 10);
        }
    }

    ctx.restore();

    // Pista de interacción
    drawText(ctx, 'Arrastra para desplazar - toca una tarjeta para leerla', w / 2, h - 78, 11, '#777', 'center');

    // Botón volver
    drawButton(ctx, w / 2 - 80, h - 60, 160, 45, 'Volver', '#D4853C', '#b06d2e');

    // ─── Detalle de tarjeta seleccionada ───
    if (selectedGalleryCard) {
        drawGalleryCardDetail(ctx, w, h, selectedGalleryCard);
    }
}

function drawGalleryCardDetail(ctx, w, h, card) {
    const cardW = Math.min(500, w * 0.88);
    const cardH = Math.min(400, h * 0.6);
    const x = (w - cardW) / 2;
    const y = (h - cardH) / 2;

    ctx.save();
    // Fondo oscuro
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, w, h);

    // Panel
    roundRect(ctx, x, y, cardW, cardH, 16);
    ctx.fillStyle = '#2a2a3e';
    ctx.fill();
    ctx.strokeStyle = '#D4853C';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Contenido
    drawTextStroke(ctx, (card.categoria || '').toUpperCase(), x + cardW / 2, y + 32, 13, '#D4853C', '#000', 'center');
    drawTextStroke(ctx, card.titulo, x + cardW / 2, y + 64, 20, '#f0e6d2', '#000', 'center');

    ctx.fillStyle = '#e0d5c0';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'left';
    wrapText(ctx, card.texto, x + 24, y + 100, cardW - 48, 20);

    ctx.fillStyle = '#F4C430';
    ctx.font = 'italic 12px Georgia, serif';
    wrapText(ctx, 'Dato: ' + card.dato_curioso, x + 24, y + cardH - 70, cardW - 48, 17);

    drawText(ctx, 'Toca para cerrar', x + cardW / 2, y + cardH - 20, 12, '#888', 'center');
    ctx.restore();
}

// ─── Helpers de dibujo ───

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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

function drawButton(ctx, x, y, w, h, text, color, hoverColor) {
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#f0e6d2';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, text, x + w / 2, y + h / 2 + 2, 16, '#f0e6d2', 'center');
}

function handleCardsInput(x, y, w, h) {
    // Si hay detalle abierto, cualquier toque lo cierra
    if (selectedGalleryCard) {
        selectedGalleryCard = null;
        return 'close_detail';
    }

    // Botón volver
    const btnX = w / 2 - 80;
    const btnY = h - 60;
    if (x >= btnX && x <= btnX + 160 && y >= btnY && y <= btnY + 45) {
        return 'back';
    }

    // Toque sobre una tarjeta desbloqueada: abrir detalle
    const margin = galleryLayout.margin;
    const cols = galleryLayout.cols;
    const cardW = galleryLayout.cardW;
    const cardH = galleryLayout.cardH;
    const startY = galleryLayout.startY;
    if (cardW > 0 && y >= startY - 10 && y <= h - 80) {
        const unlockedIds = getCards();
        for (let i = 0; i < cardsDatabase.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = margin + col * (cardW + margin);
            const cy = startY + row * (cardH + margin) + cardScrollOffset;
            if (x >= cx && x <= cx + cardW && y >= cy && y <= cy + cardH) {
                if (unlockedIds.includes(cardsDatabase[i].id)) {
                    selectedGalleryCard = cardsDatabase[i];
                    return 'open_detail';
                }
                return null;
            }
        }
    }
    return null;
}
