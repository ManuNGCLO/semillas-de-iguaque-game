# Contexto tecnico — Semillas de Iguaque: Run del Altiplano

> Prototipo jugable de la propuesta a la convocatoria de la Gobernacion de Boyaca
> (documentos PROPUESTA_*.md en la carpeta padre `F:\HCUBED\JUEGOS APK\BOY\`).

## Que es

Endless runner vertical en HTML5 Canvas, vanilla JavaScript (sin frameworks, sin build
step). 6 personajes jugables con habilidades propias, 5 zonas tematicas de Boyaca con
parallax, 3 bosses, 5 power-ups, leaderboard local y galeria de 50 tarjetas culturales
desbloqueables.

**Dos versiones jugables en el mismo deploy** (desde 2026-07-16):
- **Opcion 1** (`/`, raiz del repo): el juego original completo, side-scroller lateral,
  v3.0, auditado. Es la version "de verdad", terminada.
- **Opcion 2** (`/runner/`): prototipo de runner en perspectiva hacia adelante (3
  carriles, estilo Subway Surfers), pseudo-3D en Canvas 2D. Es un prototipo del
  *nucleo* de movimiento nada mas (una zona, sin personajes/power-ups/leaderboard
  real) — ver seccion "Runner 3D (opcion 2)" mas abajo para el detalle tecnico.

## Stack

- HTML5 Canvas 2D + requestAnimationFrame, sin frameworks ni bundler
- JS vanilla cargado como `<script>` planos (ver orden en `index.html`, importa)
- `localStorage` para progreso, high score, personajes y tarjetas desbloqueadas
- Sin dependencias de Node en runtime — Node solo se usa como servidor estatico local
  para pruebas (ver "Correr en local")

## Estructura de archivos

```
semillas-de-iguaque-game/
├── index.html          # Punto de entrada, orden de carga de scripts
├── style.css
├── src/
│   ├── utils.js       # Helpers, paths de assets (bg_*.jpg)
│   ├── storage.js     # localStorage: progreso, high score, tarjetas
│   ├── audio.js       # Musica adaptativa, SFX
│   ├── cards.js       # 50 tarjetas culturales
│   ├── zones.js       # 5 zonas, transiciones
│   ├── player.js      # Salto, planeo, deslizamiento, habilidades de personaje
│   ├── obstacles.js   # Generacion procedural de obstaculos + semillas
│   ├── powerups.js    # 5 power-ups: Ruana, Cocido, Panela, Queso, Carranga
│   ├── bosses.js      # 3 bosses: Busiraco, Mohan, Perro
│   ├── renderer.js    # Dibujo: parallax, sprites, particulas, HUD visual
│   ├── ui.js          # Menus, HUD, Game Over, galeria de tarjetas
│   ├── game.js        # Logica principal: estados, update loop, colisiones
│   └── main.js        # Bootstrap: canvas, input (touch/mouse/teclado), loop
├── assets/
│   ├── images/         # bg_*.jpg SI se usan; el resto de PNG (*.png) NO se usan
│   │                    (ver .gitignore) y quedan solo en disco local
│   └── tarjetas.json    # (duplicado tambien en docs/tarjetas.json)
├── docs/tarjetas.json
├── SPEC.md              # Spec de diseno original (numeros parcialmente desactualizados
│                          frente al balance final, ver AUDIT_V2.md)
├── AUDIT_V2.md          # Auditoria de produccion/jugabilidad v3.0 (julio 2026)
├── check.md             # Estado actual, checklist y log de sesiones (se actualiza en
│                          cada cierre de sesion)
├── contexto.md          # Este archivo
└── runner/              # Prototipo Runner 3D (opcion 2) — ver seccion propia abajo.
    ├── index.html          # Aislado: NO importa nada de src/, cero riesgo sobre
    ├── style.css           # el juego original.
    └── main.js
```

## Convenciones del proyecto

- Sin emojis en UI (ver AUDIT_V2.md punto 10 — se reemplazo un emoji de candado por
  icono vectorial por esta regla).
- Tuteo, sin voseo, en cualquier texto o commit que se le muestre a Hugo (ver
  `F:\HCUBED\CLAUDE.md`).
- Los PNG originales de `assets/images/` (sprites/fondos sin optimizar) NO se suben a
  git (`.gitignore`) porque el juego solo carga los `.jpg` optimizados de fondo — el
  resto de sprites son dibujo vectorial procedural (`player.js`).

## Deploy

- **Repo GitHub:** https://github.com/ManuNGCLO/semillas-de-iguaque-game (publico)
- **Vercel:** proyecto `hugo-emmanuel-hernandez-ramirezs-projects/semillas-de-iguaque-game`,
  conectado al repo — cada push a `master` redespliega solo, sin pasos manuales.
- **URL publica jugable (opcion 1, juego original):** https://semillas-de-iguaque-game.vercel.app
- **URL publica jugable (opcion 2, Runner 3D prototipo):** https://semillas-de-iguaque-game.vercel.app/runner/
- No hay build command (proyecto estatico); Vercel sirve los archivos tal cual, incluida
  la carpeta `runner/` (Vercel resuelve `/runner/` a `runner/index.html` automaticamente,
  igual que la raiz).

## Correr en local / depurar

No abrir `index.html` con `file://` directo en el navegador de Claude Code (el preview
tool se queda colgado con esa protocolo). Levantar un server estatico simple:

```bash
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p==='/') p='/index.html';
  if (p==='/runner/' || p==='/runner') p='/runner/index.html';
  const fp = path.join(process.cwd(), p);
  fs.readFile(fp, (err,data)=>{
    if (err) { res.writeHead(404); res.end('not found: '+p); return; }
    res.writeHead(200, {'Content-Type': mime[path.extname(fp)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8934, ()=>console.log('listening on 8934'));
"
```

y navegar a `http://localhost:8934` (juego original) o `http://localhost:8934/runner/index.html`
(el `/runner/` sin nombre de archivo puede no resolver segun el server improvisado —
si falla, usar la ruta con `index.html` explicito).

**El canvas con loop de animacion continuo (RAF) hace que el `screenshot` del preview
tool haga timeout constantemente.** No es un bug del juego — es una limitacion del tool
de captura con este tipo de render loop. Para depurar/verificar logica, usar
`javascript_tool` contra `window.iguaqueGame.game` (expuesto globalmente) en vez de
confiar en capturas:

```js
const g = window.iguaqueGame.game;   // instancia de Game
const p = g.player;                   // instancia de Player
g.state = 'PLAYING'; g.showTutorial = false;
// forzar colisiones, leer p.vy, g.powerupSystem.activeEffect, etc.
```

No hay Playwright en Python global en esta maquina; para e2e automatizado se uso antes
`playwright-core` + canal `msedge` headless via Node (ver memoria de proyecto).

## Runner 3D (opcion 2) — detalle tecnico

Prototipo en `runner/`, evaluado y aprobado por Manu el 2026-07-16 como "opcion 2" sin
reemplazar el juego original. Es un archivo aislado: no hace `<script src="../src/...">`
de nada del juego lateral, tiene su propia paleta/helpers inline y su propia clave de
`localStorage` (`iguaque_runner3d_best`, separada de `iguaque_run_save`).

**Tecnica de render — pseudo-3D con punto de fuga** (no es three.js, sigue siendo
Canvas 2D puro):

```js
function scaleAt(z) { return CAMERA_DEPTH / (CAMERA_DEPTH + Math.max(0, z)); }
function project(worldX, z, horizonY, groundY, centerX, roadHalfWidthPx) {
  const s = scaleAt(z);
  return { x: centerX + worldX * roadHalfWidthPx * s, y: horizonY + (groundY - horizonY) * s, scale: s };
}
```

- `z` va de `SPAWN_Z` (5.0, aparicion lejana) a `0` (a la altura del jugador);
  disminuye cada frame segun la velocidad actual — mismo patron que `nextSpawn -=
  gameSpeed*dt` del juego original, solo que en unidades de "profundidad" en vez de
  pixeles de pantalla.
- 3 carriles en `LANE_X = [-1, 0, 1]` (unidades de mundo). El jugador tiene un
  `worldX` que se suaviza hacia el carril objetivo cada frame (mismo estilo de lerp
  que ya se usaba en `renderer.js` para el fade: `x += (target - x) * factor`).
- El camino se dibuja como franjas trapezoidales (tipo "carretera de ajedrez") entre
  pares de profundidades, con scroll continuo — tecnica clasica de pseudo-3D racer.
- Generacion de obstaculos: nunca bloquea los 3 carriles en la misma oleada (siempre
  deja 1-2 libres), mismo principio de justicia que el juego original.

**Input**: swipe lateral = cambiar de carril; swipe hacia arriba o tap corto = saltar;
teclado (para probar en desktop) flechas/A-D para carril, flecha arriba/W/Space para
saltar. Sin swipe hacia abajo/agachar en este prototipo (no implementado aun).

**Debug**: expone `window.iguaqueRunner` igual que el juego original expone
`window.iguaqueGame`, incluyendo un `step(dt)` para avanzar frames manualmente sin
depender de `requestAnimationFrame` — util porque el tab del preview tool queda
`document.hidden` (RAF pausado por el navegador) cuando no esta enfocado:

```js
const r = window.iguaqueRunner;
r.start();
for (let i = 0; i < 600; i++) r.step(1/60); // simula 10s de juego
r.getState(); r.getPlayer(); r.getObstacles(); r.getSeeds(); r.getDistance();
```

Se valido con una IA reactiva simple (esquiva por carril o salta segun el obstaculo
mas cercano en su carril) que sobrevive 60s+ sin morir — confirma que la regla de
generacion es jugable/justa.

**Que no esta implementado aun** (a proposito, es solo el nucleo):
- Solo 1 zona (Paramo de Iguaque). Faltan las otras 4.
- Sin personajes ni power-ups. La Ruana (planeo) no tiene equivalente conceptual
  directo en un runner de carriles — habria que repensarla o quitarla si se sigue
  con esta linea.
- Sin bosses, sin leaderboard real, sin galeria de tarjetas — el prototipo tiene su
  propio mini high-score aislado, nada mas.
- Sin animacion "agacharse"/deslizar.

## Pendiente

- Empaquetar con Capacitor/Cordova para generar el APK (de la opcion 1, el juego
  terminado).
- Probar en un dispositivo Android real de gama baja (objetivo 60fps).
- Los PNG sin usar de `assets/images/` se pueden borrar del disco cuando se empaquete
  el APK (no afectan el build actual porque ya estan en `.gitignore`).
- Runner 3D (opcion 2): decision de Manu sobre si se sigue desarrollando (mas zonas,
  personajes/power-ups adaptados, integrar leaderboard/tarjetas reales) o se descarta.
  Ver detalle en `check.md`.

## Enlaces relacionados

- `AUDIT_V2.md` — detalle de todo lo resuelto en la v3.0 (visual + jugabilidad + bugs).
- `check.md` — estado actual y log de cambios por sesion (fuente de verdad de "que se
  hizo y cuando").
