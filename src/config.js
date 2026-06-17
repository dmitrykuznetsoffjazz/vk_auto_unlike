const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'settings.json');
const TOTAL_LIKES_FILE = path.join(__dirname, '..', 'totalLikes.json');

const DEFAULT_SETTINGS = {
    delay: 800,
    delaySpread: 200,
    pauseAfterCount: 12,
    pauseAfterSpread: 2,
    longPause: 15000,
    longPauseSpread: 5000,
    captchaDelay: 2000,
    clickTimeout: 3000,
};

function loadSettings() {
    let settings;
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        } catch (e) {
            console.error('Ошибка чтения settings.json, использую значения по умолчанию');
            settings = { ...DEFAULT_SETTINGS };
        }
    } else {
        settings = { ...DEFAULT_SETTINGS };
    }

    let updated = false;
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
        if (!(key in settings)) {
            settings[key] = defaultValue;
            updated = true;
        }
    }

    if (updated || !fs.existsSync(SETTINGS_FILE)) {
        try {
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        } catch (e) {
            console.error('Ошибка создания settings.json:', e.message);
        }
    }

    return settings;
}

function saveSettingsSync(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        console.log('[OK] Настройки сохранены');
    } catch (e) {
        console.error('Ошибка сохранения settings.json:', e.message);
    }
}

function loadTotalLikes() {
    try {
        if (fs.existsSync(TOTAL_LIKES_FILE)) {
            return JSON.parse(fs.readFileSync(TOTAL_LIKES_FILE, 'utf8')).total || 0;
        }
    } catch (e) {}
    return 0;
}

function saveTotalLikes(count) {
    try {
        fs.writeFileSync(TOTAL_LIKES_FILE, JSON.stringify({ total: count }), 'utf8');
    } catch (e) {}
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
    SETTINGS_FILE,
    TOTAL_LIKES_FILE,
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettingsSync,
    loadTotalLikes,
    saveTotalLikes,
    sleep,
};
