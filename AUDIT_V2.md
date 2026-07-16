# AUDITORIA PRODUCCION + JUGABILIDAD - Semillas de Iguaque

## v3.0 (julio 2026) — TODOS LOS PROBLEMAS DE v2.1 RESUELTOS

### Produccion visual (resueltos)
1. [RESUELTO] Fondos ilustrados integrados de verdad: los 5 PNG (7MB) se optimizaron a JPG (544KB total)
   y ahora se dibujan como fondo real con paneo parallax, crossfade entre zonas y oscurecido inferior
   para contraste del gameplay. Fallback procedural si la imagen no carga.
2. [RESUELTO] Obstaculos tematicos por zona con formas vectoriales: frailejon/roca/arbusto (Paramo),
   tinaja/cerca (Raquira), pilar colonial (Tunja), canon (Puente de Boyaca), maceta (Villa de Leyva).
3. [RESUELTO] Obstaculo aereo nuevo: colgante tejido (colores de ruana) que obliga a deslizarse.
4. [RESUELTO] Screen shake, particulas de recoleccion en el punto exacto, flash + burst al tomar power-up.
5. [RESUELTO] Vineta sutil, aves ambientales, siluetas de media distancia para sensacion de velocidad.
6. [RESUELTO] Menu principal con fondo ilustrado del paramo + overlay, titulo con sombra, chip subtitulo.
7. [RESUELTO] Botones con gradiente, brillo superior y borde dorado en hover (44px+ de area tactil).
8. [RESUELTO] HUD de pildoras redondeadas (distancia, semillas, pausa), anuncio flotante al cambiar de zona.

### Jugabilidad (resueltos)
1. [RESUELTO] Habilidades reales de los 6 personajes: Mateo (base), Bochica (salto mas alto),
   Policarpa (semillas x2), El Yato (planeo superior), Pedro Pascasio (doble salto),
   Santander (escudo regenerativo cada 20s). Costos rebalanceados: 0/250/600/1200/2500/5000.
2. [RESUELTO] Bug de escudo infinito: el efecto Cocido se consume al absorber un golpe.
3. [RESUELTO] Leaderboard real: top 5 carreras guardadas (distancia, semillas, personaje, fecha).
4. [RESUELTO] Deslizamiento util: colgantes exigen agacharse; swipe abajo en el aire = caida rapida
   con deslizamiento automatico al aterrizar.
5. [RESUELTO] Galeria de tarjetas completa: las 50 visibles (bloqueadas como ???), scroll tactil
   con arrastre + rueda del mouse, detalle al tocar una desbloqueada.
6. [RESUELTO] Tutorial con semillas alcanzables que se mueven hacia el jugador.
7. [RESUELTO] Bosses: telegraph de impacto en rayos de Busiraco, niebla del Mohan centrada en el
   jugador, bonus de 20 semillas + anuncio al sobrevivir, stats de bosses derrotados.
8. [RESUELTO] Pacing: ~6-12 m/s reales, velocidad maxima cerca de los 2000m, dificultad de
   obstaculos escalonada cada 250m con patrones justos (sin trampas mortales suelo+aire).
9. [RESUELTO] Input tactil en menus (tap corto = click), pausa por tap en la esquina, sin zoom.
10. [RESUELTO] Emoji de candado reemplazado por icono vectorial (regla: sin emojis en UI).

### Bugs criticos corridos ademas
- Generacion de obstaculos se detenia tras el primer chunk (nextSpawn nunca avanzaba con el scroll).
- totalRuns se contaba doble por partida.
- Datos de personajes migrados de la clave 'iguaque_characters' al save principal.
- Musica de gameplay enriquecida: melodia + bajo alternante estilo carranga.

### Verificacion (Playwright + Edge headless, viewport movil 412x915)
- Menu -> tutorial -> gameplay -> choque -> game over -> leaderboard: OK
- Crossfade de zonas, desbloqueo de personaje, detalle de tarjeta con tap tactil: OK
- 0 errores de consola. 50 tarjetas cargadas.

### Pendiente para fase APK
- Empaquetar con Capacitor/Cordova (los PNG originales de assets/images pueden excluirse
  del APK: el juego usa los .jpg optimizados; player_mateo.png y logo.png no se cargan).
- Probar en dispositivo Android real de gama baja (target 60fps).
