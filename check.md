# Check — Estado del proyecto

> Fuente de verdad de "que se hizo y cuando". Se actualiza al cierre de cada sesion
> de trabajo sobre este proyecto (ver `contexto.md` para detalle tecnico).

## Estado actual (2026-07-16)

**En produccion, jugable desde cualquier lugar.**

- URL publica: https://semillas-de-iguaque-game.vercel.app
- Repo: https://github.com/ManuNGCLO/semillas-de-iguaque-game (publico)
- Vercel redespliega solo con cada push a `master` — no requiere pasos manuales.
- Version del juego: v3.0 (ver `AUDIT_V2.md` para el detalle completo de esa auditoria).

## Checklist de fases

- [x] Diseno y propuesta (documentos `PROPUESTA_*.md` en la carpeta padre)
- [x] Prototipo jugable HTML5 Canvas (6 personajes, 5 zonas, 3 bosses, 5 power-ups,
      leaderboard, galeria de 50 tarjetas)
- [x] Auditoria de produccion visual + jugabilidad v3.0 (`AUDIT_V2.md`)
- [x] Deploy publico (GitHub + Vercel)
- [ ] Empaquetado APK con Capacitor/Cordova
- [ ] Prueba en dispositivo Android real de gama baja (objetivo 60fps)

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
