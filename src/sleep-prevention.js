const { execSync, spawn } = require('child_process');
const os = require('os');

let preventSleepProcess = null;

function preventSleep() {
    if (process.platform === 'darwin') {
        try {
            preventSleepProcess = spawn('caffeinate', ['-dims']);
            console.log('[OK] Режим предотвращения сна включён (macOS)');
        } catch (e) {
            console.warn('[!] Не удалось запустить caffeinate');
        }
    } else if (process.platform === 'win32') {
        try {
            execSync('powercfg /change -standby-timeout-ac 0', { stdio: 'ignore' });
            execSync('powercfg /change -monitor-timeout-ac 0', { stdio: 'ignore' });
            console.log('[OK] Режим предотвращения сна включён (Windows)');
        } catch (e) {
            console.warn('[!] Не удалось настроить электропитание в Windows');
        }
    } else if (process.platform === 'linux') {
        try {
            preventSleepProcess = spawn('systemd-inhibit', ['--what=idle:sleep:shutdown', '--who=vk-unlike', '--why=Prevent sleep while running', 'sleep', 'infinity']);
            console.log('[OK] Режим предотвращения сна включён (Linux)');
        } catch (e) {
            console.warn('[!] Не удалось запустить systemd-inhibit');
        }
    } else {
        console.warn('[!] Неизвестная платформа, предотвращение сна не настроено');
    }
}

function allowSleep() {
    if (preventSleepProcess) {
        preventSleepProcess.kill();
        console.log('[OK] Режим предотвращения сна выключен');
    }
    if (process.platform === 'win32') {
        try {
            execSync('powercfg /change -standby-timeout-ac 30', { stdio: 'ignore' });
            execSync('powercfg /change -monitor-timeout-ac 15', { stdio: 'ignore' });
        } catch (e) {}
    }
}

module.exports = {
    preventSleep,
    allowSleep,
};
