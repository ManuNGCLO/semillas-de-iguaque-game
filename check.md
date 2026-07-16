# Check — Estado del proyecto

> Fuente de verdad de "que se hizo y cuando". Se actualiza al cierre de cada sesion
> de trabajo sobre este proyecto (ver `contexto.md` para detalle tecnico).

## Estado actual (2026-07-16)

**En produccion, jugable desde cualquier lugar. Dos opciones de juego en el mismo deploy.**

- **Opcion 1 — Juego original (side-scroller lateral), v3.0, completo:**
  https://semillas-de-iguaque-game.vercel.app
- **Opcion 2 — Runner 3D (prototipo), carriles hacia adelante:**
  https://semillas-de-iguaque-game.vercel.app/runner/
- Repo: https://github.com/ManuNGCLO/semillas-de-iguaque-game (publico)
- Vercel redespliega solo con cada push a `master` — no requiere pasos manuales.
- Version del juego original: v3.0 (ver `AUDIT_V2.md` para el detalle de esa auditoria).

## Checklist de fases

- [x] Diseno y propuesta (documentos `PROPUESTA_*.md` en la carpeta padre)
- [x] Prototipo jugable HTML5 Canvas (6 personajes, 5 zonas, 3 bosses, 5 power-ups,
      leaderboard, galeria de 50 tarjetas)
- [x] Auditoria de produccion visual + jugabilidad v3.0 (`AUDIT_V2.md`)
- [x] Deploy publico (GitHub + Vercel)
- [x] Prototipo Runner 3D — nucleo (3 carriles, salto, swipe lateral, 1 zona) en `runner/`
- [ ] Empaquetado APK con Capacitor/Cordova
- [ ] Prueba en dispositivo Android real de gama baja (objetivo 60fps)
- [ ] Decision de Manu sobre el Runner 3D: descartar, seguir prototipando (mas
      obstaculos/zonas/personajes) o promoverlo a opcion principal

## Log de sesiones

### 2026-07-16 — Deploy inicial a GitHub + Vercel

- Se creo el repo `ManuNGCLO/semillas-de-iguaque-game` (publico) y se hizo el primer
  push del juego completo v3.0.
- `.gitignore`: se excluyeron los PNG originales de `assets/images/` (~16MB) porque el
  juego solo usa los `.jpg` optimizados de fondo — confirmado grepeando referencias en
  `src/` antes de excluirlos.
- Se desplego en Vercel (proyecto conectado al repo, sin build command — sitio
  estatico). URL publica: https://semillas-de-iguaque-game.vercel.app
- Verificado: todos los assets responden 200, sin errores de consola, titulo correcto.

### 2026-07-16 — Fix: power-up "La Ruana" reportado como "no sirve"

Manu reporto que el power-up de la Ruana no parecia hacer nada. Investigacion:

- El power-up **si funciona**: reduce la gravedad de planeo de 500 a 200 px/s²
  durante 10s (confirmado midiendo `player.vy` frame a frame en consola contra
  `window.iguaqueGame.game`, forzando la colision real con el item).
- **No es automatico**: solo actua si el jugador salta y *mantiene* presionado
  (touch hold / tecla `G`) mientras esta en el aire — igual que el planeo normal,
  pero mas lento. Si el jugador solo la recoge y sigue corriendo sin saltar/sostener,
  no hay ningun cambio perceptible. Eso explica el reporte de "no sirve".
- **Bug real encontrado y corregido** (`src/game.js`): `player.ruanaBoost` se
  asignaba *despues* de llamar a `player.update()`, que es quien lee ese valor para
  calcular la gravedad — dejaba el efecto atrasado un frame extra cada vez que se
  activaba o soltaba el planeo. Se reordeno para asignarlo antes.
- **Mejora de claridad**: se agrego un aviso en pantalla al recoger la Ruana ("La
  Ruana: salta y manten para planear"), reutilizando el sistema de anuncios flotantes
  que ya existia para cambios de zona.
- Verificado en local (server node estatico en `localhost:8934`) y en produccion tras
  el redeploy, forzando la colision real via consola — confirmado que el aviso
  aparece y que la gravedad boosteada se aplica desde el primer frame posible tras
  recoger el item.
- Commit: `21052a7` — "Corrige y aclara el power-up La Ruana".

### 2026-07-16 — Prototipo Runner 3D (opcion 2, evaluacion + implementacion)

Manu propuso cambiar la camara de lateral a "hacia adelante" estilo Subway Surfers.
Antes de tocar codigo se hizo una evaluacion honesta basada en el motor actual:

- El jugador hoy **no tiene movimiento horizontal** (`player.x` fijo en 15% del
  ancho) — el cambio de camara no es un ajuste, es rehacer el motor de
  render/fisica/colisiones (`renderer.js`, `player.js`, `obstacles.js`, dibujo de
  `zones.js`) mientras se conserva casi toda la "metagame" (estados/progreso en
  `game.js`, `storage.js`, `cards.js`, `audio.js`, personajes y power-ups como datos).
- Se comparo pseudo-3D en Canvas 2D (sin dependencias nuevas, mismo perfil de
  rendimiento para el APK en gama baja) contra three.js real (arte 3D desde cero,
  riesgo directo sobre la meta de 60fps en Android gama baja ya documentada en
  `SPEC.md`/`AUDIT_V2.md`, requiere build step nuevo).
- Recomendacion: pseudo-3D en Canvas 2D, como prototipo aislado, sin tocar ni
  reemplazar el juego v3.0 ya desplegado. Manu decidio seguir con esa opcion.

**Implementacion**: carpeta `runner/` (`index.html` + `main.js` + `style.css`),
completamente aislada — no importa nada de `src/` del juego original, cero riesgo
sobre el build v3.0. Nucleo pseudo-3D con proyeccion `scale = CAMERA_DEPTH / (CAMERA_DEPTH + z)`
(tecnica clasica de carretera con punto de fuga): 3 carriles, swipe lateral para
cambiar de carril, swipe arriba/tap corto para saltar, obstaculos que se acercan por
profundidad en vez de deslizar por el eje X, semillas coleccionables, tema visual del
Paramo de Iguaque (unica zona de este prototipo). La generacion de oleadas nunca
bloquea los 3 carriles a la vez (regla de justicia, igual principio que el juego
original). Guarda su propio mejor puntaje en `localStorage` bajo la clave
`iguaque_runner3d_best`, separada de `iguaque_run_save` del juego principal — cero
interferencia entre los dos saves.

Verificado con una API de debug expuesta en `window.iguaqueRunner` (mismo patron que
`window.iguaqueGame`): con una IA reactiva simple (esquiva por carril o salta segun el
tipo de obstaculo mas cercano) sobrevive 60s+ de juego simulado sin morir, confirmando
que la regla "nunca bloquear los 3 carriles" es justa y jugable. Sin errores de
consola en local ni en produccion. No se pudo verificar visualmente por captura de
pantalla (mismo limite del tool de preview con canvas+RAF ya documentado; se
confirmo con lectura de estado en consola en su lugar).

Commit: `83e4815` — "Agrega prototipo Runner 3D (opcion 2) como build paralelo
aislado". URLs finales:
- Juego original (opcion 1, sin cambios): https://semillas-de-iguaque-game.vercel.app
- Runner 3D (opcion 2, prototipo): https://semillas-de-iguaque-game.vercel.app/runner/

**Pendiente si Manu quiere seguir con esta linea**: mas tipos de obstaculo, las otras
4 zonas, personajes/power-ups adaptados al carril (varios ya migran sin problema,
La Ruana/planeo no aplica conceptualmente y habria que repensarla o quitarla —
ver evaluacion completa en la conversacion), integrar con el leaderboard/tarjetas
reales si se decide promoverlo a version principal.
