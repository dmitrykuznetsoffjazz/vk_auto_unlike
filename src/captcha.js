const { sleep } = require('./config');

async function handleCaptchaIfPresent(page) {
    const captchaSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="not_robot_captcha"]');
        return iframe ? iframe.src : null;
    });
    if (!captchaSrc) return false;

    console.log('Обнаружена капча!');
    await page.evaluate(() => {
        const status = document.getElementById('status-text');
        if (status) status.textContent = '🤖 Капча...';
    });

    const frames = await page.frames();
    const captchaFrame = frames.find(f => f.url().includes(captchaSrc));
    if (!captchaFrame) {
        console.log('Frame капчи не найден');
        return true;
    }

    try {
        await captchaFrame.waitForSelector('#not-robot-captcha-checkbox', { timeout: 10000 });
        const captchaDelay = await page.evaluate(() => window.__config.captchaDelay);
        if (captchaDelay > 0) {
            await sleep(captchaDelay);
        }
        await captchaFrame.click('#not-robot-captcha-checkbox');
        console.log('Чекбокс нажат');

        for (let i = 0; i < 15; i++) {
            await sleep(2000);
            const stillThere = await page.evaluate(() => !!document.querySelector('iframe[src*="not_robot_captcha"]'));
            if (!stillThere) {
                console.log('Капча пройдена');
                await page.evaluate(() => {
                    const status = document.getElementById('status-text');
                    if (status) status.textContent = 'Работаю…';
                });
                return false;
            }
            const checkbox = await captchaFrame.$('#not-robot-captcha-checkbox:not(:checked)');
            if (checkbox) await checkbox.click();
        }

        const stillThere = await page.evaluate(() => !!document.querySelector('iframe[src*="not_robot_captcha"]'));
        if (stillThere) {
            console.log('Капча не пройдена, ручной режим...');
            await page.evaluate(() => {
                const status = document.getElementById('status-text');
                if (status) status.textContent = '⛔ Пройдите капчу вручную';
            });
            while (await page.evaluate(() => !!document.querySelector('iframe[src*="not_robot_captcha"]'))) {
                await sleep(1000);
            }
            await page.evaluate(() => {
                const status = document.getElementById('status-text');
                if (status) status.textContent = 'Работаю…';
            });
        }
    } catch (e) {
        console.log('Ошибка капчи:', e.message);
        await page.evaluate(() => {
            const status = document.getElementById('status-text');
            if (status) status.textContent = '⛔ Ошибка капчи';
        });
        while (await page.evaluate(() => !!document.querySelector('iframe[src*="not_robot_captcha"]'))) {
            await sleep(1000);
        }
        await page.evaluate(() => {
            const status = document.getElementById('status-text');
            if (status) status.textContent = 'Работаю…';
        });
    }
    return false;
}

module.exports = {
    handleCaptchaIfPresent,
};
