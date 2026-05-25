document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const forkBtn = document.getElementById('fork-mode-btn');
    const injectBtn = document.getElementById('inject-btn');
    const statusMsg = document.getElementById('status-msg');

    chrome.storage.local.get(['pendingInjection'], (result) => {
        if (result.pendingInjection) {
            saveBtn.style.display = 'none';
            forkBtn.style.display = 'none';
            injectBtn.style.display = 'block';
            showStatus("יש שיחה שממתינה בזיכרון.", "green");
        }
    });

    saveBtn.addEventListener('click', async () => handleAction("EXTRACT_AND_SAVE_CHAT", "סורק את כל השיחה..."));
    forkBtn.addEventListener('click', async () => handleAction("ACTIVATE_FORK_MODE", "מצב פיצול הופעל. חזור לדף ולחץ על הבועה הרצויה."));

    injectBtn.addEventListener('click', async () => {
        statusMsg.textContent = "מזריק נתונים...";
        injectBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { action: "INJECT_SAVED_CHAT" }, (response) => {
                if (response && response.success) {
                    showStatus("הוזרק ונשלח בהצלחה!", "green");
                    injectBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    forkBtn.style.display = 'block';
                } else {
                    showStatus(response ? response.error : "שגיאה בהזרקה.", "red");
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
        }
    });

    async function handleAction(actionName, loadingText) {
        statusMsg.textContent = loadingText;
        statusMsg.style.color = "#1a73e8";
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url.includes("gemini.google.com")) {
                showStatus("שגיאה: פתח את Gemini תחילה.", "red");
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: actionName }, (response) => {
                if (actionName === "EXTRACT_AND_SAVE_CHAT" && response && response.success) {
                    showStatus("נשאב בהצלחה! פתח שיחה חדשה.", "green");
                    saveBtn.style.display = 'none';
                    forkBtn.style.display = 'none';
                    injectBtn.style.display = 'block';
                } else if (actionName === "ACTIVATE_FORK_MODE") {
                    showStatus("מצב פיצול פעיל במסך השיחה.", "green");
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
        }
    }

    function showStatus(text, color) {
        statusMsg.textContent = text;
        statusMsg.style.color = color;
        injectBtn.disabled = false;
    }
});