/**
 * storage.js - Sistema de guardado con localStorage
 * Semillas de Iguaque: Run del Altiplano
 */

const STORAGE_KEY = 'iguaque_run_save';

const DEFAULT_DATA = {
    highScore: 0,
    seeds: 0,
    cardsUnlocked: [],
    selectedCharacter: 'mateo',
    unlockedCharacters: ['mateo'],
    leaderboard: [], // top 5 partidas: { distance, seeds, character, date }
    settings: {
        musicVolume: 0.7,
        sfxVolume: 0.8,
        difficulty: 'normal'
    },
    stats: {
        totalRuns: 0,
        totalSeeds: 0,
        totalDistance: 0,
        bossesDefeated: 0
    }
};

let cache = null;

function getData() {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        cache = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_DATA));
        // Asegurar que todas las claves existan
        for (const key in DEFAULT_DATA) {
            if (cache[key] === undefined) {
                cache[key] = JSON.parse(JSON.stringify(DEFAULT_DATA[key]));
            }
        }
        // Migracion: datos de personajes de la clave antigua 'iguaque_characters'
        const oldChars = localStorage.getItem('iguaque_characters');
        if (oldChars) {
            try {
                const old = JSON.parse(oldChars);
                if (old.selected) cache.selectedCharacter = old.selected;
                if (Array.isArray(old.unlocked)) {
                    for (const id of old.unlocked) {
                        if (!cache.unlockedCharacters.includes(id)) {
                            cache.unlockedCharacters.push(id);
                        }
                    }
                }
            } catch (e) {}
            localStorage.removeItem('iguaque_characters');
            saveData();
        }
    } catch (e) {
        console.warn('Error cargando save:', e);
        cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    return cache;
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Error guardando save:', e);
    }
}

// ─── High Score ───

function getHighScore() {
    return getData().highScore;
}

function setHighScore(score) {
    const data = getData();
    if (score > data.highScore) {
        data.highScore = score;
        saveData();
        return true;
    }
    return false;
}

// ─── Semillas ───

function getSeeds() {
    return getData().seeds;
}

function addSeeds(count) {
    const data = getData();
    data.seeds += count;
    data.stats.totalSeeds += count;
    saveData();
}

function spendSeeds(count) {
    const data = getData();
    if (data.seeds >= count) {
        data.seeds -= count;
        saveData();
        return true;
    }
    return false;
}

// ─── Tarjetas ───

function getCards() {
    return getData().cardsUnlocked;
}

function hasCard(id) {
    return getData().cardsUnlocked.includes(id);
}

function unlockCard(id) {
    const data = getData();
    if (!data.cardsUnlocked.includes(id)) {
        data.cardsUnlocked.push(id);
        saveData();
        return true;
    }
    return false;
}

// ─── Personajes ───

function getSelectedCharacter() {
    return getData().selectedCharacter;
}

function setSelectedCharacter(id) {
    const data = getData();
    if (data.unlockedCharacters.includes(id)) {
        data.selectedCharacter = id;
        saveData();
        return true;
    }
    return false;
}

function getUnlockedCharacters() {
    return getData().unlockedCharacters;
}

function unlockCharacter(id) {
    const data = getData();
    if (!data.unlockedCharacters.includes(id)) {
        data.unlockedCharacters.push(id);
        saveData();
        return true;
    }
    return false;
}

// ─── Configuración ───

function getSettings() {
    return getData().settings;
}

function setSetting(key, value) {
    const data = getData();
    data.settings[key] = value;
    saveData();
}

// ─── Estadísticas ───

function getStats() {
    return getData().stats;
}

function addRun(distance, seedsCollected, characterName) {
    const data = getData();
    data.stats.totalRuns++;
    data.stats.totalDistance += Math.floor(distance);

    // Leaderboard local: top 5 partidas
    const dist = Math.floor(distance);
    if (dist >= 10) {
        if (!Array.isArray(data.leaderboard)) data.leaderboard = [];
        data.leaderboard.push({
            distance: dist,
            seeds: seedsCollected || 0,
            character: characterName || 'Mateo',
            date: Date.now()
        });
        data.leaderboard.sort((a, b) => b.distance - a.distance);
        data.leaderboard = data.leaderboard.slice(0, 5);
    }
    saveData();
}

function getLeaderboard() {
    const lb = getData().leaderboard;
    return Array.isArray(lb) ? lb : [];
}

function addBossDefeated() {
    const data = getData();
    data.stats.bossesDefeated++;
    saveData();
}

// ─── Reset ───

function resetProgress() {
    cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveData();
    console.log('Progreso reiniciado');
}

function exportSave() {
    return JSON.stringify(getData());
}

function importSave(json) {
    try {
        const data = JSON.parse(json);
        cache = data;
        saveData();
        return true;
    } catch (e) {
        return false;
    }
}
