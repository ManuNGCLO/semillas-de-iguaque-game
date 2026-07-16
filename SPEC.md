# SPEC — Semillas de Iguaque: Run del Altiplano
## Endless Runner 2D — HTML5 Canvas + JavaScript

---

## Stack Tecnologico

- **Motor:** HTML5 Canvas 2D API (vanilla JS, sin frameworks)
- **Render:** Canvas 2D con requestAnimationFrame, 60fps
- **Audio:** Web Audio API + archivos OGG/MP3
- **Input:** Touch events (touchstart, touchend) + Mouse clicks
- **Storage:** localStorage (JSON)
- **APK:** Cordova/Capacitor (fase posterior)
- **Resolucion base:** 720x1280 (9:16 vertical, mobile portrait)
- **Escalado:** Cover entire screen, maintain aspect ratio with letterboxing

---

## Estructura de Archivos

```
semillas-de-iguaque-game/
├── index.html          # Punto de entrada
├── style.css           # Estilos (fullscreen, sin scrollbars)
├── src/
│   ├── main.js         # Bootstrap: init canvas, game loop, state manager
│   ├── game.js         # Logica principal: scroll, velocidad, puntuacion
│   ├── player.js       # Mateo: salto, planeo, deslizamiento, animaciones
│   ├── renderer.js     # Dibujo: fondos parallax, sprites, particulas
│   ├── obstacles.js    # Generacion procedural de obstaculos
│   ├── zones.js        # Sistema de 5 zonas, transiciones
│   ├── powerups.js     # 5 power-ups: Ruana, Cocido, Panela, Queso, Carranga
│   ├── bosses.js       # 3 bosses: Busiraco, Mohan, Perro
│   ├── cards.js        # 50+ tarjetas culturales desbloqueables
│   ├── ui.js           # Menus, HUD, Game Over, galeria de tarjetas
│   ├── audio.js        # Musica adaptativa, SFX
│   └── storage.js      # localStorage: progreso, high score, tarjetas
├── assets/
│   ├── images/         # Sprites PNG (transparente donde aplique)
│   └── audio/          # OGG para musica y SFX
└── docs/
    └── tarjetas.json   # Base de datos de 50 tarjetas culturales
```

---

## Arquitectura

### Game Loop (60fps)
```
1. Process Input (touch/click)
2. Update Game State (player, obstacles, powerups, bosses, score)
3. Check Collisions (AABB)
4. Update Camera/Scroll
5. Render Frame (background parallax → ground → obstacles → powerups → player → particles → HUD)
```

### Estados del Juego
- `MENU` — Pantalla de inicio con animacion de fondo
- `PLAYING` — Juego activo
- `PAUSED` — Pausa
- `GAMEOVER` — Pantalla de fin con score
- `CARDS` — Galeria de tarjetas culturales
- `SETTINGS` — Configuracion (audio, dificultad)

### Variables de Estado Global
```javascript
let gameState = 'MENU';
let score = 0;           // distancia en metros
let highScore = 0;
let seeds = 0;           // monedas recolectadas
let speed = 300;         // px/segundo, aumenta progresivamente
let zone = 0;            // 0-4 (Paramo, Raquira, Tunja, Puente, Villa)
let zoneProgress = 0;    // 0-500 dentro de la zona actual
let activePowerup = null;
let powerupTimer = 0;
let isBossFight = false;
let bossType = null;
let bossTimer = 0;
let cardsUnlocked = [];  // array de IDs de tarjetas desbloqueadas
```

---

## Mecanicas

### Jugador (Mateo)
- Posicion: x=fijo (20% del canvas), y=variable
- **Salto:** velocidad Y = -600 px/s, gravedad = 1500 px/s²
- **Planeo (mantener):** gravedad reducida a 400 px/s² (cae lentamente)
- **Deslizamiento (swipe abajo):** altura reducida 50%, velocidad +50px/s
- Suelo: y = canvas.height - 100
- Hitbox: 40x60 px (reducida para ser justo)

### Scroll Infinito
- Velocidad base: 300 px/s
- Incremento: +2 px/s cada 100m
- Maximo: 600 px/s
- Obstaculos se generan fuera de pantalla (derecha) y se destruyen al salir (izquierda)
- Fondo parallax: 4 capas a diferentes velocidades

### Sistema de Zonas (cada 500m)
| Zona | ID | Color fondo | Obstaculos |
|------|-----|-------------|------------|
| Paramo de Iguaque | 0 | #4A6741 | Frailejones, rocas, huecos |
| Valle de Raquira | 1 | #C4956A | Tinajas, cercas, perros |
| Tunja Colonial | 2 | #8B7D6B | Carretas, balcones, palomas |
| Puente de Boyaca | 3 | #1E5F74 | Barcos, cañones, banderas |
| Villa de Leyva | 4 | #D4853C | Macetas, fuentes, turistas |

### Obstaculos
- Generados proceduralmente: patrones predefinidos de chunks
- Cada chunk: 800px de ancho, con 2-4 obstaculos posicionados
- Tipos: ground (en suelo), air (en aire), pit (hueco en el suelo)
- Aparicion: cada 300-500px

### Power-ups
| Nombre | Efecto | Duracion | Color |
|--------|--------|----------|-------|
| La Ruana | Planeo mejorado (gravedad 200) | 10s | #8B2500 |
| El Cocido | Escudo (1 golpe gratis) | hasta usar | #D4853C |
| Agua de Panela | Velocidad x2 | 8s | #F4C430 |
| Queso Paipa | Imán de semillas (radio 100px) | 12s | #C9A84C |
| Carranga | Invencible, destruye obstaculos | 6s | #FF4500 |

### Bosses (cada 1000m, evento de 15s)
- **Busiraco (1000m):** Rayos caen del cielo, esquivar saltando
- **Mohan (2000m):** Niebla reduce visibilidad 70%, solo se ven obstáculos cercanos
- **Perro de San Francisco (3000m):** Criatura grande salta del fondo, timing para agacharse

### Tarjetas Culturales
- Desbloqueables cada 500m (1 nueva tarjeta)
- 50+ tarjetas en base de datos JSON
- Formato: { id, titulo, categoria, texto, dato_curioso }
- Se muestran en pantalla GAMEOVER y se almacenan en galeria

---

## Assets Necesarios

### Imagenes (generar con AI)
1. `player_mateo.png` — Sprite del personaje corriendo (64x64)
2. `player_bochica.png` — Sprite alternativo (64x64)
3. `bg_paramo.png` — Fondo del paramo (720x1280)
4. `bg_raquira.png` — Fondo de Raquira (720x1280)
5. `bg_tunja.png` — Fondo de Tunja (720x1280)
6. `bg_puente.png` — Fondo del Puente (720x1280)
7. `bg_villa.png` — Fondo Villa de Leyva (720x1280)
8. `ground.png` — Suelo/textura de tierra (100x100, tileable)
9. `seed.png` — Semilla/moneda (32x32)
10. `powerup_ruana.png` — Icono ruana (48x48)
11. `powerup_cocido.png` — Icono cocido (48x48)
12. `powerup_panela.png` — Icono panela (48x48)
13. `powerup_queso.png` — Icono queso (48x48)
14. `powerup_carranga.png` — Icono carranga (48x48)
15. `obstacle_frailejon.png` — Frailejon (60x80)
16. `obstacle_rock.png` — Roca (50x50)
17. `obstacle_tinaja.png` — Tinaja (50x60)
18. `logo.png` — Logo del juego (400x200)

### Audio (generar con herramienta)
1. `music_menu.ogg` — Musica del menu (carranga suave)
2. `music_gameplay.ogg` — Musica de gameplay (carranga animada, loop)
3. `music_boss.ogg` — Musica de boss (tension)
4. `sfx_jump.ogg` — Sonido de salto
5. `sfx_powerup.ogg` — Sonido de power-up
6. `sfx_seed.ogg` — Sonido de recoger semilla
7. `sfx_hit.ogg` — Sonido de golpe
8. `sfx_gameover.ogg` — Sonido de game over

---

## Performance Targets
- 60fps en dispositivos Android gama baja (quad-core 1.4GHz)
- < 50MB total (imagenes comprimidas PNG-8, audio OGG 96kbps)
- < 100ms de input lag
- Carga inicial < 3 segundos
