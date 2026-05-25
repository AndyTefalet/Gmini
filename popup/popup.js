document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const forkBtn = document.getElementById('fork-mode-btn');
    const injectBtn = document.getElementById('inject-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusMsg = document.getElementById('status-msg');

    // פונקציה לעדכון מצב הכפתורים לפי כמות המידע שנצבר
    function updateUI() {
        chrome.storage.local.get(['accumulatedChats'], (result) => {
            const chats = result.accumulatedChats || [];
            if (chats.length > 0) {
                injectBtn.style.display = 'block';
                clearBtn.style.display = 'block';
                injectBtn.textContent = `הזרק את המידע שנצבר (${chats.length} קטעים)`;
                showStatus(`נצברו ${chats.length} קטעי שיחה בזיכרון.`, "green");
            } else {
                injectBtn.style.display = 'none';
                clearBtn.style.display = 'none';
                showStatus("הזיכרון המצטבר ריק.", "#5f6368");
            }
        });
    }

    updateUI();

    saveBtn.addEventListener('click', async () => handleAction("EXTRACT_AND_SAVE_CHAT", "סורק ומוסיף לזיכרון..."));
    forkBtn.addEventListener('click', async () => handleAction("ACTIVATE_FORK_MODE", "מצב פיצול הופעל. לחץ על הבועה הרצויה במסך."));

    // כפתור לניקוי ידני של המערך
    clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['accumulatedChats'], () => {
            updateUI();
        });
    });

    injectBtn.addEventListener('click', async () => {
        statusMsg.textContent = "מזריק ומאחד את כל קטעי המידע...";
        injectBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { action: "INJECT_SAVED_CHAT" }, (response) => {
                if (response && response.success) {
                    showStatus("הכל הוזרק ונשלח בהצלחה!", "green");
                    setTimeout(() => { updateUI(); }, 1000);
                } else {
                    showStatus(response ? response.error : "שגיאה בהזרקה.", "red");
                    injectBtn.disabled = false;
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
            injectBtn.disabled = false;
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
                if (response && response.success) {
                    if (actionName === "EXTRACT_AND_SAVE_CHAT") {
                        updateUI();
                    } else if (actionName === "ACTIVATE_FORK_MODE") {
                        showStatus("מצב פיצול פעיל במסך השיחה.", "green");
                    }
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
        }
    }

    function showStatus(text, color) {
        statusMsg.textContent = text;
        statusMsg.style.color = color;
    }
});