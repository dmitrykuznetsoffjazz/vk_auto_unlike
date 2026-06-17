const puppeteer = require('puppeteer');
const path = require('path');
const {
    loadSettings,
    saveSettingsSync,
    loadTotalLikes,
    saveTotalLikes,
    sleep,
} = require('./src/config');
const { preventSleep, allowSleep } = require('./src/sleep-prevention');
const { findChromePath, downloadChromeForTesting } = require('./src/chrome');
const { startMainLoop, stopMainLoop } = require('./src/main-loop');

const VK_PAGE = 'https://vk.com/feed?section=likes';

preventSleep();

(async () => {
    try {
        let settings = loadSettings();
        console.log('Текущие настройки:', settings);

        let totalLikes = loadTotalLikes();
        console.log(`Общее количество убранных лайков за все запуски: ${totalLikes}`);

        console.log('[INFO] Подготавливаю Chrome for Testing...');
        await downloadChromeForTesting();
        const chromePath = findChromePath();
        if (!chromePath) {
            console.error('❌ Не удалось найти Chrome.');
            process.exit(1);
        }

        const userDataDir = path.join(__dirname, 'chrome-profile');
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: chromePath,
            args: [
                `--user-data-dir=${userDataDir}`,
                '--window-position=0,0',
                '--window-size=1280,800',
                '--disable-features=TranslateUI'
            ],
            defaultViewport: null
        });

        let pages = await browser.pages();
        let page;
        if (pages.length > 0) {
            page = pages[0];
            for (let i = 1; i < pages.length; i++) {
                await pages[i].close();
            }
        } else {
            page = await browser.newPage();
        }

        // Inject launch button script
        await page.evaluateOnNewDocument(() => {
            window.addEventListener('DOMContentLoaded', () => {
                const currentUrl = window.location.href;
                const isVkMainPage = (currentUrl.includes('vk.com') || currentUrl.includes('vk.ru')) &&
                                     !currentUrl.includes('id.vk.com') &&
                                     !currentUrl.includes('id.vk.ru');
                if (!isVkMainPage) return;

                const isLikesPage = currentUrl.includes('/feed?section=likes');
                const existingBtn = document.getElementById('launch-btn');
                if (existingBtn) existingBtn.remove();

                const btn = document.createElement('button');
                btn.id = 'launch-btn';
                btn.textContent = isLikesPage ? '▶ Запустить скрипт' : 'Перейти к лайкам';
                btn.style.cssText = `
                    position: fixed; bottom: 24px; right: 24px; z-index: 999999;
                    background: rgba(255,255,255,0.85);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border: 1px solid rgba(255,255,255,0.7);
                    border-radius: 100px;
                    padding: 10px 24px;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 15px; font-weight: 600;
                    color: #1d1d1f;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                btn.onmouseover = () => { btn.style.background = 'rgba(255,255,255,0.95)'; btn.style.transform = 'scale(1.02)'; };
                btn.onmouseout = () => { btn.style.background = 'rgba(255,255,255,0.85)'; btn.style.transform = 'scale(1)'; };

                if (isLikesPage) {
                    btn.onclick = () => {
                        window.__launchClicked = true;
                        btn.style.display = 'none';
                    };
                } else {
                    btn.onclick = () => {
                        btn.style.display = 'none';
                        window.location.href = 'https://vk.com/feed?section=likes';
                    };
                }
                document.body.appendChild(btn);
            });
        });

        await page.goto(VK_PAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Ожидание нажатия кнопки запуска...');

        await page.waitForFunction(() => window.__launchClicked, { timeout: 0 });
        console.log('Кнопка запуска нажата, начинаю работу...');

        // Expose functions to the page
        await page.exposeFunction('stopScript', () => {
            stopMainLoop();
            console.log('Запрос на завершение...');
        });
        await page.exposeFunction('updateSettings', async (newSettings) => {
            Object.assign(settings, newSettings);
            saveSettingsSync(settings);
            await page.evaluate((cfg) => {
                for (const [key, val] of Object.entries(cfg)) {
                    if (window.__config[key] !== undefined) window.__config[key] = val;
                }
            }, newSettings);
            console.log('Настройки обновлены:', settings);
        });

        // Run the main loop
        await startMainLoop(page, settings, totalLikes);

        // Cleanup
        totalLikes = await page.evaluate(() => window.__config.totalLikes);
        saveTotalLikes(totalLikes);
        console.log(`Итоговый счётчик всего: ${totalLikes}`);

        pages = await browser.pages();
        await Promise.all(pages.map(p => p.close()));
        await sleep(500);
        await browser.close();
        console.log('Браузер закрыт. Скрипт завершён.');

    } catch (error) {
        console.error('Критическая ошибка:', error);
        process.exit(1);
    } finally {
        allowSleep();
        process.exit(0);
    }
})();
