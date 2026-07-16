# Contexto tecnico — Semillas de Iguaque: Run del Altiplano

> Prototipo jugable de la propuesta a la convocatoria de la Gobernacion de Boyaca
> (documentos PROPUESTA_*.md en la carpeta padre `F:\HCUBED\JUEGOS APK\BOY\`).

## Que es

Endless runner vertical en HTML5 Canvas, vanilla JavaScript (sin frameworks, sin build
step). 6 personajes jugables con habilidades propias, 5 zonas tematicas de Boyaca con
parallax, 3 bosses, 5 power-ups, leaderboard local y galeria de 50 tarjetas culturales
desbloqueables.

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
└── contexto.md          # Este archivo
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
- **URL publica jugable:** https://semillas-de-iguaque-game.vercel.app
- No hay build command (proyecto estatico); Vercel sirve los archivos tal cual.

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
  const fp = path.join(process.cwd(), p);
  fs.readFile(fp, (err,data)=>{
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {'Content-Type': mime[path.extname(fp)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8934, ()=>console.log('listening on 8934'));
"
```

y navegar a `http://localhost:8934`.

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

## Pendiente

- Empaquetar con Capacitor/Cordova para generar el APK.
- Probar en un dispositivo Android real de gama baja (objetivo 60fps).
- Los PNG sin usar de `assets/images/` se pueden borrar del disco cuando se empaquete
  el APK (no afectan el build actual porque ya estan en `.gitignore`).

## Enlaces relacionados

- `AUDIT_V2.md` — detalle de todo lo resuelto en la v3.0 (visual + jugabilidad + bugs).
- `check.md` — estado actual y log de cambios por sesion (fuente de verdad de "que se
  hizo y cuando").
