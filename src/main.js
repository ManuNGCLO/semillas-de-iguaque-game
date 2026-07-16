/**
 * main.js - Punto de entrada del juego
 * Semillas de Iguaque: Run del Altiplano
 */

(function() {
    'use strict';

    // ─── Inicialización ───
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let game;
    let lastTime = 0;
    let animFrameId = null;

    // ─── Configuración del canvas ───
    function setupCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
    }

    // ─── Carga de assets ───
    /**
     * Carga los assets del juego y las tarjetas JSON.
     * Usa Promises para manejar la carga asíncrona de forma robusta.
     * Detecta si el DOM ya está listo para evitar quedarse esperando el evento 'load'.
     */
    function loadAssets(callback) {
        var toLoad = 0, loaded = 0;

        /**
         * Verifica si todas las imágenes cargaron, luego carga las tarjetas JSON.
         */
        function check() {
            loaded++;
            if (loaded >= toLoad) {
                // Todas las imágenes cargadas (o fallaron), ahora cargar tarjetas
                fetch('assets/tarjetas.json')
                    .then(function(response) {
                        if (!response.ok) throw new Error('No se pudo cargar tarjetas.json');
                        return response.json();
                    })
                    .then(function(data) {
                        if (typeof loadCardsDatabase === 'function') {
                            loadCardsDatabase(data);
                            console.log('Tarjetas cargadas:', cardsDatabase.length);
                        }
                        if (callback) callback();
                    })
                    .catch(function(err) {
                        console.warn('Error cargando tarjetas:', err);
                        // Fallback: cargar datos embebidos vacíos para no romper el juego
                        if (typeof loadCardsDatabase === 'function') {
                            loadCardsDatabase({ tarjetas: [] });
                        }
                        if (callback) callback();
                    });
            }
        }

        // Si existen assets de imágenes globales, cargarlas
        if (typeof assets !== 'undefined' && assets.images) {
            for (var key in assets.images) {
                toLoad++;
                var img = new Image();
                img.onload = check;
                img.onerror = function() {
                    console.warn('Error cargando imagen:', this.src);
                    check();
                };
                img.src = assets.images[key];
                assets[key] = img;
            }
        }

        if (toLoad === 0) {
            // No hay imágenes que cargar, ir directamente a las tarjetas
            check();
        }
    }

    // ─── Inicializar juego ───
    function init() {
        try {
            setupCanvas();
            game = new Game(canvas);

            // Configurar input
            setupInput();

            // Cargar settings
            const settings = getSettings();
            audioManager.setMusicVolume(settings.musicVolume);
            audioManager.setSFXVolume(settings.sfxVolume);

            // Iniciar música del menú
            audioManager.init();
            audioManager.playMusic('menu');

            // Iniciar game loop
            lastTime = performance.now();
            gameLoop(lastTime);

            console.log('Semillas de Iguaque: Run del Altiplano - Iniciado');
        } catch (e) {
            console.error('Error en init():', e);
        }
    }

    // ─── Game Loop ───
    /**
     * Bucle principal del juego con manejo de errores robusto.
     * Si ocurre un error, se loguea pero el loop continúa para no congelar el juego.
     */
    function gameLoop(currentTime) {
        try {
            // Programar el siguiente frame primero para evitar que un error detenga el loop
            animFrameId = requestAnimationFrame(gameLoop);

            const rawDt = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Cap delta time para evitar saltos grandes (lag spikes, tab cambiado, etc.)
            const dt = Math.min(rawDt, 0.05);

            // Update y render con protección de errores
            if (game) {
                game.update(dt);
                game.render();
            }
        } catch (e) {
            console.error('Error en game loop:', e);
            // Reintentar el loop en el siguiente frame para no congelar el juego
            animFrameId = requestAnimationFrame(gameLoop);
        }
    }

    // ─── Input handling ───

    function setupInput() {
        let touchStartY = 0;
        let touchStartX = 0;
        let touchStartTime = 0;
        let touchMoved = 0;
        let isTouching = false;
        let glideTimer = null;

        // Touch events
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            touchStartX = x;
            touchStartY = y;
            touchStartTime = Date.now();
            touchMoved = 0;
            isTouching = true;

            if (game && game.handleInput) {
                game.handleInput(x, y, 'touchstart');
            }

            // Timer para detectar hold (planeo)
            if (game && game.state === 'PLAYING') {
                glideTimer = setTimeout(() => {
                    if (isTouching && game && game.handleInput) {
                        game.handleInput(x, y, 'hold');
                    }
                }, 200);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            touchMoved += Math.abs(y - touchStartY) + Math.abs(x - touchStartX);

            // Detectar swipe hacia abajo
            if (game && game.state === 'PLAYING' && isTouching) {
                const dy = y - touchStartY;
                if (dy > 50 && game.handleInput) {
                    game.handleInput(x, y, 'swipe_down');
                    touchStartY = y; // Reset para no disparar múltiples veces
                }
            }

            // Arrastre en la galeria de tarjetas
            if (game && game.state === 'CARDS' && isTouching && game.handleInput) {
                game.handleInput(x, y, 'drag');
            }
        }, { passive: false });

        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            isTouching = false;
            if (glideTimer) {
                clearTimeout(glideTimer);
                glideTimer = null;
            }
            if (game && game.handleInput) {
                game.handleInput(touchStartX, touchStartY, 'touchend');

                // En menus, un tap corto sin arrastre equivale a un click
                if (game.state !== 'PLAYING' && touchMoved < 14) {
                    game.handleInput(touchStartX, touchStartY, 'click');
                }
            }
        }, { passive: false });

        // Rueda del mouse: scroll en la galeria
        canvas.addEventListener('wheel', function(e) {
            if (game && game.handleWheel) {
                e.preventDefault();
                game.handleWheel(e.deltaY);
            }
        }, { passive: false });

        // Mouse events (para desktop)
        canvas.addEventListener('mousedown', function(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (game && game.state === 'PLAYING' && game.handleInput) {
                game.handleInput(x, y, 'touchstart');
            } else if (game && game.handleInput) {
                game.handleInput(x, y, 'click');
            }
        });

        canvas.addEventListener('mousemove', function(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Hover effects para botones
            if (!game || !game.ui || !game.ui.checkButtons) return;

            if (game.state === 'MENU') {
                game.ui.checkButtons(game.menuButtons, x, y);
            } else if (game.state === 'PAUSED') {
                game.ui.checkButtons(game.pauseButtons, x, y);
            } else if (game.state === 'GAMEOVER') {
                game.ui.checkButtons(game.gameOverButtons, x, y);
            } else if (game.state === 'SETTINGS') {
                game.ui.checkButtons(game.settingsButtons, x, y);
            }
        });

        canvas.addEventListener('mouseup', function(e) {
            if (game && game.state === 'PLAYING' && game.handleInput) {
                game.handleInput(0, 0, 'touchend');
            }
        });

        // Teclado
        document.addEventListener('keydown', function(e) {
            if (!game) return;

            if (game.state === 'PLAYING') {
                switch (e.code) {
                    case 'Space':
                    case 'ArrowUp':
                        e.preventDefault();
                        if (game.player && game.player.jump) game.player.jump();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        if (game.player && game.player.slide) game.player.slide();
                        break;
                    case 'KeyP':
                    case 'Escape':
                        e.preventDefault();
                        if (game.pause) game.pause();
                        break;
                    case 'KeyG':
                        e.preventDefault();
                        if (game.player && game.player.glide) game.player.glide(true);
                        break;
                }
            } else if (game.state === 'PAUSED') {
                if (e.code === 'Escape' || e.code === 'Space') {
                    e.preventDefault();
                    if (game.resume) game.resume();
                }
            } else if (game.state === 'GAMEOVER') {
                if (e.code === 'Space') {
                    e.preventDefault();
                    if (game.start) game.start();
                }
            }
        });

        document.addEventListener('keyup', function(e) {
            if (e.code === 'KeyG' && game && game.player && game.player.glide) {
                game.player.glide(false);
            }
        });

        // Prevenir zoom en móviles
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });
        document.addEventListener('gesturechange', function(e) {
            e.preventDefault();
        });
        document.addEventListener('gestureend', function(e) {
            e.preventDefault();
        });
    }

    // ─── Resize ───
    window.addEventListener('resize', function() {
        setupCanvas();
        if (game && game.resize) {
            game.resize();
        }
    });

    // ─── Prevent default touch behaviors ───
    document.addEventListener('touchmove', function(e) {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });

    // ─── Pantalla de carga ───
    function drawLoadingScreen() {
        setupCanvas();
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#D4853C';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SEMILLAS DE IGUAQUE', canvas.width / 2, canvas.height / 2 - 22);
        ctx.fillStyle = '#f0e6d2';
        ctx.font = '15px Georgia, serif';
        ctx.fillText('Cargando...', canvas.width / 2, canvas.height / 2 + 14);
    }

    // ─── Start ───
    // Detectar si el DOM ya está listo para evitar quedarse esperando el evento 'load'
    // Si los scripts están al final del <body>, el DOM ya está parseado, pero necesitamos
    // asegurarnos de que todos los scripts (incluyendo dependencias) se hayan ejecutado.
    if (document.readyState === 'loading') {
        // El DOM aún no está listo, esperar
        document.addEventListener('DOMContentLoaded', function() {
            drawLoadingScreen();
            loadAssets(function() {
                init();
            });
        });
    } else {
        // El DOM ya está listo (scripts al final del body), ejecutar inmediatamente
        drawLoadingScreen();
        loadAssets(function() {
            init();
        });
    }

    // ─── Expose for debugging ───
    window.iguaqueGame = {
        get game() { return game; },
        get state() { return game ? game.state : 'none'; }
    };
})();
