/**
 * audio.js - Sistema de audio con Web Audio API
 * Semillas de Iguaque: Run del Altiplano
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.sounds = {};
        this.musicNode = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.masterGain = null;
        this.currentMusic = null;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.initialized = false;
        this.musicMuted = false;
        this.sfxMuted = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.ctx.destination);
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API no disponible:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ─── Generación procedural de sonidos ───

    createTone(freq, duration, type, volume) {
        if (!this.ctx) return null;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume || 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        return { osc, gain };
    }

    // ─── Efectos de sonido ───

    playSFX(name) {
        if (!this.ctx || this.sfxMuted) return;
        this.resume();

        switch (name) {
            case 'jump':
                this.playJump();
                break;
            case 'powerup':
                this.playPowerup();
                break;
            case 'seed':
                this.playSeed();
                break;
            case 'hit':
                this.playHit();
                break;
            case 'gameover':
                this.playGameOver();
                break;
            case 'boss_warning':
                this.playBossWarning();
                break;
            case 'slide':
                this.playSlide();
                break;
            case 'click':
                this.playClick();
                break;
            default:
                break;
        }
    }

    playJump() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    playPowerup() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);
            gain.gain.setValueAtTime(0.2, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.3);
        });
    }

    playSeed() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playHit() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    playGameOver() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const notes = [440, 370, 311, 220];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.25);
            gain.gain.setValueAtTime(0.25, t + i * 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.25);
            osc.stop(t + i * 0.25 + 0.4);
        });
    }

    playBossWarning() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, t + i * 0.3);
            osc.frequency.exponentialRampToValueAtTime(100, t + i * 0.3 + 0.2);
            gain.gain.setValueAtTime(0.2, t + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.3);
            osc.stop(t + i * 0.3 + 0.2);
        }
    }

    playSlide() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    playClick() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    // ─── Música procedural ───

    playMusic(name) {
        if (!this.ctx || this.musicMuted) return;
        this.resume();
        if (this.currentMusic === name && this.musicNode) return;
        this.stopMusic();
        this.currentMusic = name;

        switch (name) {
            case 'menu':
                this.generateMenuMusic();
                break;
            case 'gameplay':
                this.generateGameplayMusic();
                break;
            case 'boss':
                this.generateBossMusic();
                break;
            default:
                break;
        }
    }

    stopMusic() {
        if (this.musicNode) {
            try {
                this.musicNode.stop();
            } catch (e) {}
            this.musicNode = null;
        }
        this.currentMusic = null;
    }

    generateMenuMusic() {
        if (!this.ctx) return;
        // Carranga suave: acordeón aproximado con ondas
        const t = this.ctx.currentTime;
        this.musicNode = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        this.musicNode.type = 'triangle';
        // Melodía lenta de carranga
        const melody = [262, 294, 330, 349, 330, 294, 262, 220];
        let time = t;
        this.musicNode.frequency.setValueAtTime(melody[0], time);
        melody.forEach((freq, i) => {
            this.musicNode.frequency.setValueAtTime(freq, t + i * 0.5);
        });
        gain.gain.value = 0.15;
        this.musicNode.connect(gain);
        gain.connect(this.musicGain);
        this.musicNode.start(t);
        this.musicNode.stop(t + melody.length * 0.5);
        // Loop
        this.musicNode.onended = () => {
            if (this.currentMusic === 'menu') {
                this.generateMenuMusic();
            }
        };
    }

    generateGameplayMusic() {
        if (!this.ctx) return;
        // Carranga animada: melodia + bajo alternante (guitarra y tiple aproximados)
        const melody = [330, 392, 440, 494, 440, 392, 330, 294, 330, 392, 440, 523, 494, 440, 392, 349];
        const bass = [165, 196, 165, 147, 165, 196, 220, 196];
        const playNote = (index) => {
            if (this.currentMusic !== 'gameplay') return;
            const t = this.ctx.currentTime;

            // Melodia
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(melody[index % melody.length], t);
            gain.gain.setValueAtTime(0.11, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(t);
            osc.stop(t + 0.22);

            // Bajo en tiempos pares (patron de guitarra campesina)
            if (index % 2 === 0) {
                const bOsc = this.ctx.createOscillator();
                const bGain = this.ctx.createGain();
                bOsc.type = 'sine';
                bOsc.frequency.setValueAtTime(bass[(index / 2) % bass.length], t);
                bGain.gain.setValueAtTime(0.15, t);
                bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                bOsc.connect(bGain);
                bGain.connect(this.musicGain);
                bOsc.start(t);
                bOsc.stop(t + 0.4);
            }

            this.musicNode = osc;
            osc.onended = () => {
                if (this.currentMusic === 'gameplay') {
                    setTimeout(() => playNote((index + 1) % melody.length), 40);
                }
            };
        };
        playNote(0);
    }

    generateBossMusic() {
        if (!this.ctx) return;
        const notes = [165, 185, 208, 220, 208, 185, 165, 147];
        let index = 0;
        const playNote = () => {
            if (this.currentMusic !== 'boss') return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(notes[index % notes.length], this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
            this.musicNode = osc;
            index++;
            osc.onended = () => {
                if (this.currentMusic === 'boss') {
                    setTimeout(playNote, 100);
                }
            };
        };
        playNote();
    }

    // ─── Volúmenes ───

    setMusicVolume(v) {
        this.musicVolume = clamp(v, 0, 1);
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    setSFXVolume(v) {
        this.sfxVolume = clamp(v, 0, 1);
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }

    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        if (this.musicMuted) {
            this.stopMusic();
        }
        return this.musicMuted;
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        return this.sfxMuted;
    }
}

// Instancia global
const audioManager = new AudioManager();
