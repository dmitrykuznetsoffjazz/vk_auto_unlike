const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync, spawnSync } = require('child_process');

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

function findChromePath() {
    const customPaths = [];
    if (process.platform === 'darwin') {
        const macDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-mac-'));
        for (const dir of macDirs) {
            customPaths.push(path.join(__dirname, '..', dir, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'));
        }
    } else if (process.platform === 'win32') {
        const winDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-win'));
        for (const dir of winDirs) {
            customPaths.push(path.join(__dirname, '..', dir, 'chrome.exe'));
        }
    } else {
        const linDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-linux'));
        for (const dir of linDirs) {
            customPaths.push(path.join(__dirname, '..', dir, 'chrome'));
        }
    }

    for (const candidate of customPaths) {
        if (fs.existsSync(candidate)) {
            console.log(`[OK] Используется Chrome for Testing: ${candidate}`);
            if (process.platform === 'darwin') {
                try {
                    const appPath = path.join(path.dirname(path.dirname(candidate)), '..');
                    execSync(`xattr -d com.apple.quarantine "${appPath}"`, { stdio: 'ignore' });
                    console.log('[OK] Карантинный атрибут снят.');
                } catch (e) {}
            }
            return candidate;
        }
    }

    const systemCandidates = [];
    switch (process.platform) {
        case 'darwin':
            systemCandidates.push(
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
            );
            break;
        case 'win32':
            systemCandidates.push(
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
            );
            break;
        case 'linux':
            systemCandidates.push(
                '/usr/bin/google-chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/chromium',
            );
            break;
    }
    for (const candidate of systemCandidates) {
        if (fs.existsSync(candidate)) {
            console.log(`[OK] Используется системный Chrome: ${candidate}`);
            return candidate;
        }
    }

    return null;
}

async function downloadChromeForTesting() {
    try {
        const latestVersion = await getLatestChromeVersion();

        if (await isInstalledChromeUpToDate(latestVersion.version)) {
            console.log(`[OK] Chrome for Testing версия ${latestVersion.version} уже установлена и актуальна`);
            return;
        }

        const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
        let platformKey;
        if (process.platform === 'darwin') {
            platformKey = arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
        } else if (process.platform === 'win32') {
            platformKey = arch === 'x64' ? 'win64' : 'win32';
        } else if (process.platform === 'linux') {
            platformKey = 'linux64';
        } else {
            console.error('[ERROR] Неподдерживаемая ОС.');
            process.exit(1);
        }

        console.log(`[INFO] Удаляю старые версии Chrome...`);
        const projectRoot = path.join(__dirname, '..');
        const chromeDirs = fs.readdirSync(projectRoot).filter(f => {
            if (process.platform === 'darwin') {
                return f.startsWith('chrome-mac-');
            } else if (process.platform === 'win32') {
                return f.startsWith('chrome-win');
            } else {
                return f.startsWith('chrome-linux');
            }
        });

        for (const dir of chromeDirs) {
            try {
                const dirPath = path.join(projectRoot, dir);
                execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
                console.log(`[OK] Удалена папка: ${dir}`);
            } catch (e) {
                console.warn(`[WARN] Не удалось удалить ${dir}: ${e.message}`);
            }
        }

        const zipPath = path.join(projectRoot, `chrome-for-testing-${platformKey}.zip`);
        console.log('[INFO] Загружаю Chrome for Testing версия ' + latestVersion.version);

        await downloadWithProgress(latestVersion.downloadUrl, zipPath);

        console.log('[INFO] Распаковка архива...');
        let extractCmd;
        if (process.platform === 'win32') {
            extractCmd = `tar -xf "${zipPath}" -C "${projectRoot}"`;
        } else {
            extractCmd = `unzip -o "${zipPath}" -d "${projectRoot}"`;
        }

        try {
            execSync(extractCmd, { stdio: 'pipe' });
        } catch (e) {
            if (process.platform === 'win32') {
                try {
                    execSync(`powershell -Command "Expand-Archive -Force '${zipPath}' '${projectRoot}'\"`, { stdio: 'pipe' });
                } catch (e2) {
                    throw new Error('Не удалось распаковать архив.');
                }
            } else {
                throw e;
            }
        }

        try { fs.unlinkSync(zipPath); } catch (e) {}
        console.log('[OK] Chrome for Testing версия ' + latestVersion.version + ' установлен.');

    } catch (err) {
        console.error('[ERROR] Не удалось автоматически скачать Chrome for Testing.');
        console.error(err.message);
        process.exit(1);
    }
}

function checkChromeAvailable() {
    const customPaths = [];
    if (process.platform === 'darwin') {
        const macDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-mac-'));
        for (const dir of macDirs) {
            customPaths.push(path.join(__dirname, '..', dir, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'));
        }
    } else if (process.platform === 'win32') {
        const winDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-win'));
        for (const dir of winDirs) {
            customPaths.push(path.join(__dirname, '..', dir, 'chrome.exe'));
        }
    } else {
        const linDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-linux'));
        for (const dir of linDirs) {
            customPaths.push(path.join(__dirname, '..', dir, 'chrome'));
        }
    }

    let downloadedChromePath = null;
    for (const candidate of customPaths) {
        if (fs.existsSync(candidate)) {
            downloadedChromePath = candidate;
            break;
        }
    }

    const systemCandidates = [];
    switch (process.platform) {
        case 'darwin':
            systemCandidates.push(
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
            );
            break;
        case 'win32':
            systemCandidates.push(
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
            );
            break;
        case 'linux':
            systemCandidates.push(
                '/usr/bin/google-chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/chromium',
            );
            break;
    }

    let systemChromePath = null;
    for (const candidate of systemCandidates) {
        if (fs.existsSync(candidate)) {
            systemChromePath = candidate;
            break;
        }
    }

    return {
        downloadedChromePath,
        systemChromePath,
        hasDownloaded: !!downloadedChromePath,
        hasSystem: !!systemChromePath,
    };
}

function getChromeExecutableVersion(chromePath) {
    try {
        if (!chromePath || !fs.existsSync(chromePath)) {
            return null;
        }

        const result = spawnSync(chromePath, ['--version'], {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['ignore', 'pipe', 'ignore']
        });

        if (result.error || result.status !== 0) {
            return null;
        }

        const output = result.stdout.trim();
        const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

async function downloadWithProgress(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        let startTime = Date.now();
        let downloadedBytes = 0;
        let totalBytes = 0;

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            totalBytes = parseInt(res.headers['content-length'], 10);
            let lastUpdateTime = Date.now();

            res.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const now = Date.now();

                if (now - lastUpdateTime > 500 || downloadedBytes === totalBytes) {
                    lastUpdateTime = now;
                    const progress = (downloadedBytes / totalBytes * 100).toFixed(1);
                    const barLength = 25;
                    const filledLength = Math.round(barLength * downloadedBytes / totalBytes);
                    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

                    const elapsed = (now - startTime) / 1000;
                    const speed = (downloadedBytes / elapsed / 1024 / 1024).toFixed(1);
                    const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
                    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

                    process.stdout.write(`\r⬇️  ${progress}% [${bar}] ${downloadedMB} MB / ${totalMB} MB (${speed} MB/s)  `);
                }
            });

            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('\n[OK] Загрузка завершена');
                resolve();
            });
            file.on('error', reject);
        }).on('error', reject);
    });
}

async function isInstalledChromeUpToDate(latestVersion) {
    try {
        const customPaths = [];
        if (process.platform === 'darwin') {
            const macDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-mac-'));
            for (const dir of macDirs) {
                const candidate = path.join(__dirname, '..', dir, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
                customPaths.push(candidate);
            }
        } else if (process.platform === 'win32') {
            const winDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-win'));
            for (const dir of winDirs) {
                const candidate = path.join(__dirname, '..', dir, 'chrome.exe');
                customPaths.push(candidate);
            }
        } else {
            const linDirs = fs.readdirSync(__dirname + '/..').filter(f => f.startsWith('chrome-linux'));
            for (const dir of linDirs) {
                const candidate = path.join(__dirname, '..', dir, 'chrome');
                customPaths.push(candidate);
            }
        }

        for (const chromePath of customPaths) {
            if (fs.existsSync(chromePath)) {
                const installedVersion = getChromeExecutableVersion(chromePath);
                if (!installedVersion) {
                    console.log('[WARN] Не удалось получить версию установленного Chrome');
                    return false;
                }
                const comparison = compareVersions(installedVersion, latestVersion);
                if (comparison === 0) {
                    console.log(`[OK] Chrome for Testing версия ${latestVersion} уже установлена`);
                    return true;
                } else if (comparison > 0) {
                    console.log(`[INFO] Chrome версия ${installedVersion} новее требуемой ${latestVersion}`);
                    return true;
                } else {
                    console.log(`[INFO] Chrome версия ${installedVersion} старше требуемой ${latestVersion}, обновляю...`);
                    return false;
                }
            }
        }

        console.log('[INFO] Chrome for Testing не найден в папке проекта');
        return false;
    } catch (e) {
        console.error('[WARN] Ошибка проверки версии загруженного Chrome:', e.message);
        return false;
    }
}

async function getLatestChromeVersion() {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    let platformKey;
    if (process.platform === 'darwin') {
        platformKey = arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    } else if (process.platform === 'win32') {
        platformKey = arch === 'x64' ? 'win64' : 'win32';
    } else if (process.platform === 'linux') {
        platformKey = 'linux64';
    } else {
        throw new Error('Неподдерживаемая ОС');
    }

    const apiUrl = 'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json';
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const stableInfo = data.channels.Stable;
    if (!stableInfo) throw new Error('Stable channel not found');

    const chromeEntry = stableInfo.downloads.chrome.find(d => d.platform === platformKey);
    if (!chromeEntry) throw new Error(`No download for platform ${platformKey}`);

    return {
        version: stableInfo.version,
        downloadUrl: chromeEntry.url,
        platformKey: platformKey
    };
}

module.exports = {
    findChromePath,
    downloadChromeForTesting,
    checkChromeAvailable,
    getLatestChromeVersion,
    getChromeExecutableVersion,
    isInstalledChromeUpToDate,
    compareVersions,
};
