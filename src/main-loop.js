const { sleep, saveTotalLikes } = require('./config');
const { handleCaptchaIfPresent } = require('./captcha');

let stopRequested = false;

async function startMainLoop(page, settings, totalLikes) {
    // First, create the UI panel
    const { createUIPanel } = require('./ui-panel');
    await createUIPanel(page, { ...settings, totalLikes });

    let clicksSinceLastPause = 0;
    let currentPauseThreshold = await page.evaluate(() => window.randInRange(window.__config.pauseAfterCount, window.__config.pauseAfterSpread));
    await page.evaluate((limit) => {
        const el = document.getElementById('live-limit');
        if (el) el.textContent = limit;
    }, currentPauseThreshold);

    while (true) {
        if (stopRequested) {
            console.log('Остановка по команде пользователя...');
            break;
        }

        const config = await page.evaluate(() => window.__config);
        if (config.stopped || stopRequested) break;

        const captchaFlag = await page.evaluate(() => window.__captchaVisible);
        if (captchaFlag) {
            await handleCaptchaIfPresent(page);
            await page.evaluate(() => { window.__captchaVisible = false; });
            continue;
        }

        if (config.paused) {
            await sleep(500);
            continue;
        }

        const btnInfo = await page.evaluate(() => {
            const btn = window.findButton();
            if (btn) {
                const span = btn.querySelector('span');
                return { text: span ? span.textContent.replace(/\s+/g, ' ').trim() : '' };
            }
            return null;
        });

        if (btnInfo) {
            await page.evaluate(async () => {
                const btn = window.findButton();
                if (btn) {
                    await window.smoothScrollToElement(btn);
                    await new Promise(r => setTimeout(r, 300));
                    window.realClick(btn);
                    window.__config.clickCount++;
                    window.__config.totalLikes++;
                    window.__config.clicksSinceLastPause++;
                    window.updateStats();
                }
            });
            clicksSinceLastPause++;

            if (btnInfo.text) {
                try {
                    await page.waitForFunction(
                        (text) => ![...document.querySelectorAll('button')].some(b => {
                            const span = b.querySelector('span');
                            return span && span.textContent.replace(/\s+/g, ' ').trim() === text;
                        }),
                        { timeout: config.clickTimeout },
                        btnInfo.text
                    );
                } catch (e) { }
            }

            const stats = await page.evaluate(() => ({
                clickCount: window.__config.clickCount,
                totalLikes: window.__config.totalLikes
            }));
            console.log(`Реакция убрана (сессия: ${stats.clickCount}, всего: ${stats.totalLikes})`);
            saveTotalLikes(stats.totalLikes);

            const randomDelay = await page.evaluate(() => {
                const cfg = window.__config;
                const ms = window.randInRange(cfg.delay, cfg.delaySpread);
                const el = document.getElementById('live-delay');
                if (el) el.textContent = ms + ' мс';
                return ms;
            });
            await sleep(randomDelay);

            if (clicksSinceLastPause >= currentPauseThreshold) {
                const randomLongPause = await page.evaluate(() => {
                    const cfg = window.__config;
                    const ms = window.randInRange(cfg.longPause, cfg.longPauseSpread);
                    const el = document.getElementById('live-pause');
                    if (el) el.textContent = (ms / 1000) + ' сек';
                    return ms;
                });
                console.log(`Пауза ${randomLongPause / 1000} сек...`);
                await page.evaluate(ms => {
                    const status = document.getElementById('status-text');
                    if (status) status.textContent = `Пауза ${ms / 1000} сек…`;
                }, randomLongPause);

                const pauseEnd = Date.now() + randomLongPause;
                while (Date.now() < pauseEnd && !stopRequested) {
                    const flag = await page.evaluate(() => window.__captchaVisible);
                    if (flag) {
                        console.log('Капча во время паузы!');
                        await handleCaptchaIfPresent(page);
                        await page.evaluate(() => { window.__captchaVisible = false; });
                    }
                    await sleep(2000);
                }
                if (stopRequested) break;

                await page.evaluate(() => {
                    const status = document.getElementById('status-text');
                    if (status) status.textContent = 'Работаю…';
                });

                clicksSinceLastPause = 0;
                await page.evaluate(() => { window.__config.clicksSinceLastPause = 0; window.updateStats(); });
                currentPauseThreshold = await page.evaluate(() => window.randInRange(window.__config.pauseAfterCount, window.__config.pauseAfterSpread));
                await page.evaluate((limit) => {
                    const el = document.getElementById('live-limit');
                    if (el) el.textContent = limit;
                }, currentPauseThreshold);
            }
        } else {
            console.log('Подгружаем контент...');
            await page.evaluate(async () => {
                const status = document.getElementById('status-text');
                if (status) status.textContent = 'Подгрузка…';
                await window.smoothScrollBy(600, 600 + Math.random() * 400);
            });
            await sleep(1500);
        }
    }
}

function stopMainLoop() {
    stopRequested = true;
}

module.exports = {
    startMainLoop,
    stopMainLoop,
};
