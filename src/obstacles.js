/**
 * obstacles.js - Sistema de obstáculos procedural
 * Semillas de Iguaque: Run del Altiplano
 */

// Catálogo de obstáculos de suelo: dimensiones por tipo
const GROUND_OBSTACLE_TYPES = {
    frailejon: { w: 42, h: 68 },
    rock:      { w: 46, h: 42 },
    bush:      { w: 50, h: 38 },
    tinaja:    { w: 48, h: 56 },
    stump:     { w: 36, h: 50 },
    maceta:    { w: 42, h: 52 },
    canon:     { w: 72, h: 48 },
    pillar:    { w: 34, h: 74 },
    fence:     { w: 62, h: 46 }
};

// Altura libre bajo el obstáculo colgante: obliga a deslizarse
const HANGING_CLEARANCE = 38;

class ObstacleSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
        this.obstacles = [];
        this.seeds = [];
        this.minGap = 260;
        this.maxGap = 460;
        this.nextSpawn = canvasWidth + 200;
        this.difficulty = 1;
        this.time = 0;

        // ─── MEJORA 4: Dificultad escalonada ───
        this.difficultyLevel = 0;
    }

    // ─── MEJORA 4: Método para ajustar dificultad ───
    setDifficulty(level) {
        this.difficultyLevel = level;
        this.minGap = Math.max(200, 260 - level * 10);
        this.maxGap = Math.max(320, 460 - level * 15);
    }

    // ─── Tipos de obstáculos ───

    getObstacleTypes(zone) {
        if (!zone) return ['ground'];
        return zone.obstacles || ['ground'];
    }

    spawnGroundObstacle(x, zone) {
        const names = (zone && zone.groundTypes) ? zone.groundTypes : ['rock', 'stump', 'bush'];
        const name = names[Math.floor(Math.random() * names.length)];
        const dims = GROUND_OBSTACLE_TYPES[name] || { w: 44, h: 48 };
        return {
            x: x,
            y: this.GROUND_Y - dims.h,
            w: dims.w,
            h: dims.h,
            type: 'ground',
            name: name,
            passed: false
        };
    }

    // Obstáculo colgante: hay que deslizarse por debajo
    spawnAirObstacle(x, zone) {
        const height = random(85, 135);
        const bottomY = this.GROUND_Y - HANGING_CLEARANCE;
        return {
            x: x,
            y: bottomY - height,
            w: random(46, 64),
            h: height,
            type: 'air',
            name: 'colgante',
            passed: false
        };
    }

    spawnPit(x, zone) {
        const width = random(60, 110);
        return {
            x: x,
            y: this.GROUND_Y + 10,
            w: width,
            h: 100,
            type: 'pit',
            name: 'pit',
            color: zone ? zone.groundColor : '#333',
            passed: false
        };
    }

    // ─── Generación de chunks ───

    generateChunk(zone, difficulty) {
        const count = Math.floor(random(2, 4));
        const types = this.getObstacleTypes(zone);
        let currentX = this.nextSpawn;

        for (let i = 0; i < count; i++) {
            const gap = random(this.minGap, this.maxGap);
            currentX += gap;

            const roll = Math.random();
            if (this.difficultyLevel >= 6 && roll < 0.15) {
                // Triple: suelo, colgante, suelo — con espacio justo entre cada uno
                this.obstacles.push(this.spawnGroundObstacle(currentX, zone));
                this.obstacles.push(this.spawnAirObstacle(currentX + 230, zone));
                this.obstacles.push(this.spawnGroundObstacle(currentX + 460, zone));
                currentX += 460;
            } else if (this.difficultyLevel >= 4 && roll < 0.3) {
                // Colgante seguido de obstáculo de suelo
                this.obstacles.push(this.spawnAirObstacle(currentX, zone));
                this.obstacles.push(this.spawnGroundObstacle(currentX + 250, zone));
                currentX += 250;
            } else if (this.difficultyLevel >= 2 && roll < 0.45) {
                // Doble obstáculo de suelo cercano (salto largo o dos saltos rápidos)
                this.obstacles.push(this.spawnGroundObstacle(currentX, zone));
                this.obstacles.push(this.spawnGroundObstacle(currentX + 110, zone));
                currentX += 110;
            } else {
                const type = types[Math.floor(Math.random() * types.length)];
                let obs;
                switch (type) {
                    case 'air':
                        obs = this.spawnAirObstacle(currentX, zone);
                        break;
                    case 'pit':
                        obs = this.spawnPit(currentX, zone);
                        break;
                    default:
                        obs = this.spawnGroundObstacle(currentX, zone);
                        break;
                }
                this.obstacles.push(obs);
            }

            // Añadir semillas entre obstáculos
            if (Math.random() > 0.3) {
                this.spawnSeedRow(currentX + gap / 2, zone);
            }
        }

        this.nextSpawn = currentX + 250;
    }

    spawnSeedRow(x, zone) {
        const patterns = ['line', 'arc', 'single'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const groundY = this.GROUND_Y - 30;

        switch (pattern) {
            case 'line':
                for (let i = 0; i < 3; i++) {
                    this.seeds.push({
                        x: x + i * 40,
                        y: groundY - random(0, 30),
                        w: 16,
                        h: 20,
                        collected: false,
                        type: 'seed'
                    });
                }
                break;
            case 'arc':
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 4) * Math.PI;
                    this.seeds.push({
                        x: x + i * 30,
                        y: groundY - 20 - Math.sin(angle) * 60,
                        w: 16,
                        h: 20,
                        collected: false,
                        type: 'seed'
                    });
                }
                break;
            default:
                this.seeds.push({
                    x: x,
                    y: groundY - random(10, 60),
                    w: 16,
                    h: 20,
                    collected: false,
                    type: 'seed'
                });
        }
    }

    // ─── Actualización ───

    update(dt, gameSpeed, zone, difficulty) {
        this.difficulty = difficulty;
        this.time += dt;

        // Mover obstáculos
        for (const obs of this.obstacles) {
            obs.x -= gameSpeed * dt;
        }

        // Mover semillas
        for (const seed of this.seeds) {
            seed.x -= gameSpeed * dt;
        }

        // Limpiar fuera de pantalla
        this.obstacles = this.obstacles.filter(o => o.x + o.w > -100);
        this.seeds = this.seeds.filter(s => s.x > -100 && !s.collected);

        // El punto de spawn también avanza con el mundo
        this.nextSpawn -= gameSpeed * dt;

        // Generar nuevo chunk si es necesario
        if (this.nextSpawn < this.canvasW + 400) {
            this.generateChunk(zone, difficulty);
        }
    }

    // ─── Colisiones ───

    checkCollision(player) {
        const pBox = player.getHitbox();
        const results = { hit: false, hitType: null, seeds: 0 };

        for (const obs of this.obstacles) {
            const oBox = {
                x: obs.x + 5,
                y: obs.y + 5,
                w: obs.w - 10,
                h: obs.h - 10
            };

            // Obstáculos destruibles por carranga o invencibilidad post-golpe
            if (player.isInvincible || player.invincible) {
                if (obs.type !== 'pit' && rectCollision(pBox, oBox)) {
                    obs.x = -999; // Eliminar obstáculo sin daño
                    continue;
                }
            }

            // Pozo - caer
            if (obs.type === 'pit') {
                if (pBox.x + pBox.w > obs.x && pBox.x < obs.x + obs.w) {
                    if (player.isGrounded) {
                        results.hit = true;
                        results.hitType = 'pit';
                        return results;
                    }
                }
                continue;
            }

            if (rectCollision(pBox, oBox)) {
                results.hit = true;
                results.hitType = obs.type;
                return results;
            }
        }

        return results;
    }

    /**
     * Revisa recolección de semillas.
     * Devuelve { count, positions } para que el juego pueda emitir partículas.
     */
    checkSeeds(player, hasMagnet, dt) {
        const pBox = player.getHitbox();
        const magnetBox = hasMagnet ? player.getSeedMagnetHitbox() : pBox;
        const result = { count: 0, positions: [] };
        const step = dt || 0.016;

        for (const seed of this.seeds) {
            if (seed.collected) continue;

            const sBox = { x: seed.x, y: seed.y, w: seed.w, h: seed.h };

            // Imán
            if (hasMagnet && rectCollision(magnetBox, sBox)) {
                const dx = (player.x + player.width / 2) - seed.x;
                const dy = (player.y + player.height / 2) - seed.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5) {
                    seed.x += (dx / dist) * 450 * step;
                    seed.y += (dy / dist) * 450 * step;
                }
            }

            if (rectCollision(pBox, sBox)) {
                seed.collected = true;
                result.count++;
                result.positions.push({ x: seed.x + seed.w / 2, y: seed.y + seed.h / 2 });
            }
        }

        return result;
    }

    // ─── Dibujo ───

    draw(ctx, zone) {
        // Dibujar obstáculos
        for (const obs of this.obstacles) {
            if (obs.x > this.canvasW + 100) continue;
            this.drawObstacleEntity(ctx, obs, zone);
        }

        // Dibujar semillas
        for (const seed of this.seeds) {
            if (!seed.collected) {
                drawSeed(ctx, seed.x + seed.w / 2, seed.y + seed.h / 2, 8, true);
            }
        }
    }

    drawObstacleEntity(ctx, obs, zone) {
        ctx.save();

        switch (obs.type) {
            case 'ground':
                // Sombra
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(obs.x + obs.w / 2, obs.y + obs.h - 1, obs.w / 2 + 4, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Forma temática (definida en zones.js)
                drawObstacle(ctx, obs.name, obs.x, obs.y, obs.w, obs.h);
                break;

            case 'air':
                drawHangingObstacle(ctx, obs.x, obs.y, obs.w, obs.h, this.time);
                break;

            case 'pit':
                ctx.fillStyle = '#12121a';
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                // Degradado de profundidad
                const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y + 40);
                grad.addColorStop(0, 'rgba(0,0,0,0.6)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(obs.x, obs.y, obs.w, 40);
                // Bordes
                ctx.fillStyle = zone ? zone.groundDetail : '#333';
                ctx.fillRect(obs.x - 3, obs.y - 5, 6, 8);
                ctx.fillRect(obs.x + obs.w - 3, obs.y - 5, 6, 8);
                break;
        }

        ctx.restore();
    }

    // ─── Reset ───

    reset() {
        this.obstacles = [];
        this.seeds = [];
        this.nextSpawn = this.canvasW + 200;
        this.difficultyLevel = 0;
        this.minGap = 260;
        this.maxGap = 460;
        this.time = 0;
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.GROUND_Y = canvasHeight - 80;
    }
}
