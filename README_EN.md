# VK Unlike

[🇬🇧 English](README_EN.md) | [🇷🇺 Русский](README.md)

## What it does

Automatically removes all reactions from posts in the «Reactions» section of VKontakte.  
An interface with settings allows you to manage delays and pauses directly in the browser window.

## ⚠️ Disclaimer

This script is provided in its current state **"AS IS"** without any warranties. The author is not responsible for any losses, issues with your VKontakte account, or any other negative consequences that may arise from using this script. Use at your own risk.

## Important to know

### How the script works:

* The script only works with the open [«Reactions»](https://vk.com/feed?section=likes) section. The script opens a browser where you need to authorize in VK, then go to the reactions page (or click the button).

* **All** reactions are removed (likes, anger, joy).

* Removing reactions from deleted posts is **impossible**.

* Built-in mechanism for automatic captcha completion (checkbox "I'm not a robot"). If the captcha becomes more complex (slider or images), the script will pause and ask you to complete it manually, then resume.

* If you perform actions too frequently, VK may temporarily block the ability to add reactions — the script uses variable pauses to avoid this, but there are no guarantees. If you see an "Unknown error" message, just wait and run again. There is a built-in pause button.

* All settings are saved in real-time, the progress of removing reactions is not lost when stopped.

* Don't minimize the browser window — the script must remain visible for the MutationObserver to work correctly. You can keep it on a second monitor.

### About the project:

* Uses **Puppeteer** for browser automation.

* **Chrome for Testing** is automatically downloaded and updated on first run (the script checks the version and downloads the latest one if necessary).

* Settings (delays, pauses) are stored in `settings.json`, the total count of removed reactions is stored in `totalLikes.json`.

* Each time the script runs, a new browser session is opened (cookies and history are not saved between runs).

* When you click the «Stop» button in the control panel, the script will stop, the browser will close, and progress will be saved.

## How to use

### Requirements:

* Installed [Node.js](https://nodejs.org/en/download/) version 18 or higher.

* npm package manager (included with Node.js).

* Internet connection to download Chrome for Testing.

### Setup and run:

1. Download the repository.

2. Extract it.

3. Open a terminal in the project folder and run:
	```bash
	npm install
	```
4. Wait for dependencies to install (puppeteer and others).

5. Run the script with:
	```bash
	npm start
	```

6. On first run, the script will automatically download Chrome for Testing. A browser window will open. If you need to authorize in VK, do it manually.

7. After the page loads, a «▶ Start script» button will appear in the bottom right corner. Click it — a control panel will appear and reactions will start being removed.

8. In the bottom left corner you will see the current random delay values and limit, as well as statistics.

9. If a captcha appears, the script will try to pass it automatically. If it fails, you will see a message «⛔ Complete captcha manually» — just complete the verification in the browser, and the script will continue.

10. To stop the script, click the ⏹ button in the panel. The browser will close, all data will be saved, and the console process will end automatically.

### Settings (via the panel in the browser):

- ⏱ **Delay (ms)** — base delay between clicks (± variation)
- 🔢 **Clicks before pause** — how many reactions before a long pause (± variation)
- ⏳ **Long pause (sec)** — duration of the long pause (± variation)
- 🤖 **Captcha (sec)** — delay before automatic click on captcha checkbox
- ⏲ **Button wait (sec)** — maximum time to wait for the clicked button to disappear

All changes are saved in `settings.json`.

## Support

If you found this script useful, you can [support the author](https://boosty.to/dmitrykuznetsoff/donate).

Pull requests and bug reports are welcome, though testing may be limited.

P.S.: Yes, this was made largely by AI, but it works as of June 17, 2026.
