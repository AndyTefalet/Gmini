document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const injectBtn = document.getElementById('inject-btn');
    const statusMsg = document.getElementById('status-msg');

    // בדיקת מצב הזיכרון בעת פתיחת החלון
    chrome.storage.local.get(['pendingInjection'], (result) => {
        if (result.pendingInjection) {
            saveBtn.style.display = 'none';
            injectBtn.style.display = 'block';
            showStatus("יש שיחה שממתינה בזיכרון.", "green");
        }
    });

    // כפתור השאיבה (הקוד הקיים)
    saveBtn.addEventListener('click', async () => {
        statusMsg.textContent = "סורק את השיחה...";
        statusMsg.style.color = "#1a73e8";
        saveBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url.includes("gemini.google.com")) {
                showStatus("שגיאה: פתח את Gemini תחילה.", "red");
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_AND_SAVE_CHAT" }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus("שגיאת תקשורת. אנא רענן את העמוד.", "red");
                    return;
                }
                if (response && response.success) {
                    showStatus("נשאב בהצלחה! פתח שיחה חדשה.", "green");
                    saveBtn.style.display = 'none';
                    injectBtn.style.display = 'block';
                } else {
                    showStatus(response.error || "שגיאה בשאיבה.", "red");
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
        }
    });

    // כפתור ההזרקה (הקוד החדש)
    injectBtn.addEventListener('click', async () => {
        statusMsg.textContent = "מזריק נתונים...";
        injectBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url.includes("gemini.google.com")) {
                showStatus("שגיאה: פתח שיחה חדשה ב-Gemini.", "red");
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: "INJECT_SAVED_CHAT" }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus("שגיאת תקשורת. אנא רענן את העמוד.", "red");
                    return;
                }
                if (response && response.success) {
                    showStatus("הוזרק ונשלח בהצלחה!", "green");
                    injectBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    saveBtn.disabled = false;
                } else {
                    showStatus(response.error || "שגיאה בהזרקה.", "red");
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
        }
    });

    function showStatus(text, color) {
        statusMsg.textContent = text;
        statusMsg.style.color = color;
        saveBtn.disabled = false;
        injectBtn.disabled = false;
    }
});