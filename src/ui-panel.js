async function createUIPanel(page, settings) {
    await page.evaluate((cfg) => {
        const {
            delay, delaySpread,
            pauseAfterCount, pauseAfterSpread,
            longPause, longPauseSpread,
            captchaDelay, clickTimeout,
            totalLikes
        } = cfg;

        window.__config = {
            delay, delaySpread,
            pauseAfterCount, pauseAfterSpread,
            longPause, longPauseSpread,
            captchaDelay, clickTimeout,
            paused: false,
            stopped: false,
            clickCount: 0,
            totalLikes,
            clicksSinceLastPause: 0
        };

        window.randInRange = (base, spread) => base + Math.floor(Math.random() * (2 * spread + 1)) - spread;

        window.smoothScrollBy = async (distance, duration = 600) => {
            const start = window.scrollY;
            const startTime = performance.now();
            return new Promise(resolve => {
                function step(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = progress < 0.5 ? 2*progress*progress : 1 - Math.pow(-2*progress + 2, 2)/2;
                    window.scrollTo(0, start + distance * ease);
                    if (progress < 1) requestAnimationFrame(step);
                    else resolve();
                }
                requestAnimationFrame(step);
            });
        };

        window.smoothScrollToElement = async (el, offset = -10) => {
            const rect = el.getBoundingClientRect();
            const targetY = window.scrollY + rect.top - window.innerHeight/2 + offset;
            const distance = targetY - window.scrollY;
            if (Math.abs(distance) < 5) return;
            await window.smoothScrollBy(distance, 500 + Math.random()*300);
        };

        window.findButton = () => {
            const prefix = 'Убрать реакцию';
            let btn = [...document.querySelectorAll('button')].find(b => {
                const span = b.querySelector('span');
                return span && span.textContent.replace(/\s+/g, ' ').trim().startsWith(prefix);
            });
            if (btn) return btn;
            btn = [...document.querySelectorAll('[role="button"]')].find(el => {
                const span = el.querySelector('span');
                return span && span.textContent.replace(/\s+/g, ' ').trim().startsWith(prefix);
            });
            if (btn) return btn;
            btn = [...document.querySelectorAll('.vkuiInternalTappable')].find(el => {
                const span = el.querySelector('span');
                return span && span.textContent.replace(/\s+/g, ' ').trim().startsWith(prefix);
            });
            return btn || null;
        };

        window.realClick = (el) => {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width/2;
            const y = rect.top + rect.height/2;
            const opts = { bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: x, clientY: y, view: window };
            el.dispatchEvent(new MouseEvent('mousedown', opts));
            el.dispatchEvent(new MouseEvent('mouseup', opts));
            el.dispatchEvent(new MouseEvent('click', opts));
        };

        window.updateStats = () => {
            const liveSince = document.getElementById('live-clicks-since-pause');
            const liveSession = document.getElementById('live-current-count');
            const liveTotal = document.getElementById('live-total-count');
            if (liveSince) liveSince.textContent = window.__config.clicksSinceLastPause;
            if (liveSession) liveSession.textContent = window.__config.clickCount;
            if (liveTotal) liveTotal.textContent = window.__config.totalLikes;
        };

        window.updateLiveParams = (delayMs, limit, pauseSec) => {
            const elDelay = document.getElementById('live-delay');
            const elLimit = document.getElementById('live-limit');
            const elPause = document.getElementById('live-pause');
            if (elDelay) elDelay.textContent = delayMs + ' мс';
            if (elLimit) elLimit.textContent = limit;
            if (elPause) elPause.textContent = pauseSec + ' сек';
        };

        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn) launchBtn.remove();

        // ПРАВАЯ панель
        const panel = document.createElement('div');
        panel.id = 'like-remover-panel';
        panel.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap');
                #like-remover-panel {
                    position: fixed; bottom: 24px; right: 24px; z-index: 999998;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px; color: #1d1d1f; width: 320px;
                    background: rgba(255,255,255,0.72);
                    backdrop-filter: blur(30px) saturate(180%);
                    -webkit-backdrop-filter: blur(30px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.45);
                    border-radius: 28px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04);
                    overflow: hidden;
                    display: flex; flex-direction: column;
                }
                .panel-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 12px 18px 10px;
                    background: rgba(255,255,255,0.35);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border-bottom: 1px solid rgba(255,255,255,0.5);
                    gap: 8px;
                }
                .status-text {
                    font-weight: 590; font-size: 15px;
                    letter-spacing: -0.02em; color: #1d1d1f; flex: 1;
                }
                .header-btns {
                    display: flex; align-items: center; gap: 6px;
                }
                .header-btns button {
                    background: rgba(255,255,255,0.65);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.8);
                    border-radius: 100px;
                    width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px; color: #1d1d1f;
                    cursor: pointer; transition: all 0.2s;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.04); padding: 0;
                }
                .header-btns button:hover {
                    background: rgba(255,255,255,0.85);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.06);
                    transform: translateY(-0.5px);
                }
                .header-btns button:active { transform: scale(0.95); }
                .minimize-btn { font-size: 20px; color: #86868b; }
                #panel-content {
                    max-height: 600px;
                    overflow: hidden;
                    transition: max-height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .minimized #panel-content { max-height: 0; }
                .panel-inner {
                    padding: 16px 20px 20px;
                    display: flex; flex-direction: column; gap: 14px;
                }
                .param-block { display: flex; flex-direction: column; gap: 4px; }
                .param-block label {
                    font-weight: 500; font-size: 11px; color: #6e6e73;
                    text-transform: uppercase; letter-spacing: 0.02em;
                }
                .input-row { display: flex; align-items: baseline; gap: 6px; }
                .input-row input {
                    width: 70px; padding: 4px 2px 2px 2px;
                    border: none; border-bottom: 1.5px solid transparent;
                    background: transparent;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 18px; font-weight: 600; color: #1d1d1f;
                    text-align: center; outline: none;
                    transition: all 0.15s ease; caret-color: #0071e3;
                }
                .input-row input:focus {
                    border-bottom-color: #0071e3;
                    background: rgba(255,255,255,0.55);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.04);
                    border-radius: 8px 8px 0 0;
                }
                .spread-input { width: 55px !important; }
                .input-row span { font-size: 14px; color: #8e8e93; }
            </style>
            <div class="panel-header">
                <span class="status-text" id="status-text">Работаю…</span>
                <div class="header-btns">
                    <button id="pause-btn" title="Пауза / Продолжить">⏸</button>
                    <button id="stop-btn" title="Стоп">⏹</button>
                    <button class="minimize-btn" id="minimize-btn" title="Свернуть">–</button>
                </div>
            </div>
            <div id="panel-content">
                <div class="panel-inner">
                    <div class="param-block">
                        <label>⏱ Задержка (мс)</label>
                        <div class="input-row">
                            <input id="delay-input" type="number" value="${delay}" step="50" min="200">
                            <span>±</span><input id="delay-spread-input" class="spread-input" type="number" value="${delaySpread}" step="50" min="0">
                        </div>
                    </div>
                    <div class="param-block">
                        <label>🔢 Кликов до паузы</label>
                        <div class="input-row">
                            <input id="count-input" type="number" value="${pauseAfterCount}" min="1">
                            <span>±</span><input id="count-spread-input" class="spread-input" type="number" value="${pauseAfterSpread}" min="0">
                        </div>
                    </div>
                    <div class="param-block">
                        <label>⏳ Длинная пауза (сек)</label>
                        <div class="input-row">
                            <input id="long-pause-input" type="number" value="${longPause/1000}" step="0.5" min="1">
                            <span>±</span><input id="long-pause-spread-input" class="spread-input" type="number" value="${longPauseSpread/1000}" step="0.5" min="0">
                        </div>
                    </div>
                    <div class="param-block">
                        <label>🤖 Капча (сек)</label>
                        <div class="input-row">
                            <input id="captcha-delay-input" type="number" value="${captchaDelay/1000}" step="0.5" min="0">
                        </div>
                    </div>
                    <div class="param-block">
                        <label>⏲ Ожидание кнопки (сек)</label>
                        <div class="input-row">
                            <input id="click-timeout-input" type="number" value="${clickTimeout/1000}" step="0.5" min="0.5">
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // ЛЕВЫЙ блок статистики
        const livePanel = document.createElement('div');
        livePanel.id = 'live-params-panel';
        livePanel.innerHTML = `
            <style>
                #live-params-panel {
                    position: fixed; bottom: 24px; left: 24px; z-index: 999998;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px; color: #1d1d1f; width: 360px;
                    background: rgba(255,255,255,0.72);
                    backdrop-filter: blur(30px) saturate(180%);
                    -webkit-backdrop-filter: blur(30px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.45);
                    border-radius: 28px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04);
                    padding: 18px 22px;
                    display: flex; flex-direction: column; gap: 16px;
                }
                .live-row { display: flex; justify-content: space-between; align-items: center; }
                .live-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
                .live-value { font-size: 18px; font-weight: 590; color: #1d1d1f; }
                .live-label {
                    font-size: 11px; font-weight: 500; color: #6e6e73;
                    text-transform: uppercase; letter-spacing: 0.03em;
                }
                .live-stats-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
            </style>
            <div class="live-row">
                <div class="live-item">
                    <div class="live-value" id="live-delay">${delay} мс</div>
                    <div class="live-label">Задержка</div>
                </div>
                <div class="live-item">
                    <div class="live-value" id="live-limit">${pauseAfterCount}</div>
                    <div class="live-label">Лимит</div>
                </div>
                <div class="live-item">
                    <div class="live-value" id="live-pause">${longPause/1000} сек</div>
                    <div class="live-label">Пауза</div>
                </div>
            </div>
            <div class="live-stats-row">
                <div class="live-item">
                    <div class="live-value" id="live-clicks-since-pause">0</div>
                    <div class="live-label">Между паузами</div>
                </div>
                <div class="live-item">
                    <div class="live-value" id="live-current-count">0</div>
                    <div class="live-label">Сессия</div>
                </div>
                <div class="live-item">
                    <div class="live-value" id="live-total-count">${totalLikes}</div>
                    <div class="live-label">Всего</div>
                </div>
            </div>
        `;
        document.body.appendChild(livePanel);

        let minimized = false;
        document.getElementById('minimize-btn').onclick = () => {
            minimized = !minimized;
            panel.classList.toggle('minimized', minimized);
            document.getElementById('minimize-btn').textContent = minimized ? '□' : '–';
        };
        document.getElementById('pause-btn').onclick = function() {
            window.__config.paused = !window.__config.paused;
            this.textContent = window.__config.paused ? '▶' : '⏸';
            const status = document.getElementById('status-text');
            if (status) status.textContent = window.__config.paused ? 'Приостановлено' : 'Работаю…';
        };
        document.getElementById('stop-btn').onclick = () => {
            window.__config.stopped = true;
            const status = document.getElementById('status-text');
            if (status) status.textContent = 'Остановлено';
            if (window.stopScript) window.stopScript();
        };

        function applyAndSaveSettings() {
            const d = parseInt(document.getElementById('delay-input').value);
            const ds = parseInt(document.getElementById('delay-spread-input').value);
            const c = parseInt(document.getElementById('count-input').value);
            const cs = parseInt(document.getElementById('count-spread-input').value);
            const lp = parseFloat(document.getElementById('long-pause-input').value);
            const lps = parseFloat(document.getElementById('long-pause-spread-input').value);
            const cap = parseFloat(document.getElementById('captcha-delay-input').value);
            const ct = parseFloat(document.getElementById('click-timeout-input').value);

            window.__config.delay = d;
            window.__config.delaySpread = ds;
            window.__config.pauseAfterCount = c;
            window.__config.pauseAfterSpread = cs;
            window.__config.longPause = lp * 1000;
            window.__config.longPauseSpread = lps * 1000;
            window.__config.captchaDelay = cap * 1000;
            window.__config.clickTimeout = ct * 1000;

            if (window.updateSettings) {
                window.updateSettings({
                    delay: d, delaySpread: ds,
                    pauseAfterCount: c, pauseAfterSpread: cs,
                    longPause: lp * 1000, longPauseSpread: lps * 1000,
                    captchaDelay: cap * 1000, clickTimeout: ct * 1000
                });
            }
        }

        let saveTimer = null;
        panel.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    applyAndSaveSettings();
                    saveTimer = null;
                }, 500);
            });
        });

        window.updateStats();
        window.updateLiveParams(delay, pauseAfterCount, longPause/1000);
        window.__panelReady = true;
    }, { ...settings, totalLikes: settings.totalLikes || 0 });

    await page.evaluate(() => {
        window.__captchaVisible = false;
        const observer = new MutationObserver(() => {
            const iframe = document.querySelector('iframe[src*="not_robot_captcha"]');
            window.__captchaVisible = !!iframe;
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

module.exports = {
    createUIPanel,
};
