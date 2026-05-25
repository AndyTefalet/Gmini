// ==========================================
// 1. האזנה להודעות מה-Popup (לגיבוי בלבד)
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_AND_SAVE_CHAT") {
        executeExtraction(null, sendResponse);
        return true; 
    }
    if (request.action === "ACTIVATE_FORK_MODE") {
        injectForkButtons();
        sendResponse({ success: true });
        return true;
    }
    if (request.action === "INJECT_SAVED_CHAT") {
        executeInjection(sendResponse);
        return true;
    }
});

// ==========================================
// 2. בניית הממשק הצף (Floating UI)
// ==========================================
// ==========================================
// 2. בניית הממשק הצף (Floating UI) - כולל מנגנון קיפול
// ==========================================
function createFloatingPanel() {
    // מניעת הזרקה כפולה
    if (document.getElementById('gemini-temp-floating-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'gemini-temp-floating-panel';
    // המיקום המותאם אישית שלך, בתוספת הגדרות מעבר (Transition) לתחושה חלקה
    panel.style.cssText = 'position: fixed; top: 1px; left: 290px; z-index: 999999; background: #ffffff; padding: 12px 15px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 1px solid #dadce0; display: flex; flex-direction: column; font-family: "Segoe UI", Tahoma, Geneva, sans-serif; direction: rtl; width: 220px; transition: all 0.3s ease;';

    // חלוקה לכותרת (לחיצה) ותוכן (ניתן להסתרה)
    panel.innerHTML = `
        <div id="float-header" style="font-weight: 800; font-size: 14px; color: #1a73e8; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;">
            <span>צבירת ידע - Gemini</span>
            <span id="float-toggle-icon" style="font-size: 12px; transition: transform 0.3s;">▼</span>
        </div>
        
        <div id="float-content" style="display: flex; flex-direction: column; gap: 10px; overflow: hidden; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
            <button id="float-save-btn" style="background: #1a73e8; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; transition: 0.2s;">שאב שיחה נוכחית</button>
            <button id="float-fork-btn" style="background: #fbbc04; color: #202124; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; transition: 0.2s;">✂️ הפעל מצב פיצול</button>
            <button id="float-inject-btn" style="display: none; background: #0f9d58; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; transition: 0.2s;"></button>
            <button id="float-clear-btn" style="display: none; background: #ea4335; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; transition: 0.2s;">נקה זיכרון</button>
            <div id="float-status" style="font-size: 12px; color: #5f6368; text-align: center; min-height: 16px; font-weight: 600;"></div>
        </div>
    `;

    document.body.appendChild(panel);

    // לוגיקת הקיפול והפתיחה (Toggle)
    const header = document.getElementById('float-header');
    const content = document.getElementById('float-content');
    const icon = document.getElementById('float-toggle-icon');

    header.addEventListener('click', () => {
        if (content.style.display === 'none') {
            content.style.display = 'flex';
            icon.style.transform = 'rotate(0deg)';
        } else {
            content.style.display = 'none';
            icon.style.transform = 'rotate(180deg)'; // היפוך החץ
        }
    });

    // הפעלת הפונקציות ישירות מהממשק הצף
    document.getElementById('float-save-btn').addEventListener('click', () => {
        updateFloatStatus("סורק ושואב...", "#1a73e8");
        executeExtraction();
    });

    document.getElementById('float-fork-btn').addEventListener('click', () => {
        injectForkButtons();
        updateFloatStatus("מצב פיצול פעיל. בחר בועה.", "green");
    });

    document.getElementById('float-clear-btn').addEventListener('click', () => {
        chrome.storage.local.remove(['accumulatedChats']);
    });

    document.getElementById('float-inject-btn').addEventListener('click', () => {
        updateFloatStatus("מזריק ומאחד...", "#1a73e8");
        executeInjection((response) => {
            if(response && response.success) {
                updateFloatStatus("הוזרק בהצלחה!", "green");
            } else {
                updateFloatStatus(response ? response.error : "שגיאה בהזרקה.", "red");
            }
        });
    });

    updateFloatingUIState();
}

function updateFloatStatus(text, color) {
    const statusEl = document.getElementById('float-status');
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.style.color = color;
    }
}

function updateFloatingUIState() {
    chrome.storage.local.get(['accumulatedChats'], (result) => {
        const chats = result.accumulatedChats || [];
        const injectBtn = document.getElementById('float-inject-btn');
        const clearBtn = document.getElementById('float-clear-btn');
        
        if (!injectBtn || !clearBtn) return;

        if (chats.length > 0) {
            injectBtn.style.display = 'block';
            clearBtn.style.display = 'block';
            injectBtn.textContent = `הזרק מידע (${chats.length} קטעים)`;
            updateFloatStatus(`נצברו ${chats.length} קטעי שיחה בזיכרון.`, "green");
        } else {
            injectBtn.style.display = 'none';
            clearBtn.style.display = 'none';
            updateFloatStatus("הזיכרון המצטבר ריק.", "#5f6368");
        }
    });
}

// האזנה לשינויים בזיכרון כדי לעדכן את הממשק הצף בזמן אמת
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.accumulatedChats) {
        updateFloatingUIState();
    }
});

// וידוא שהממשק שורד מעברים בין עמודים בארכיטקטורת SPA של גוגל
setInterval(createFloatingPanel, 1000);


// ==========================================
// 3. מנוע החילוץ (Extraction)
// ==========================================
function injectForkButtons() {
    const messages = document.querySelectorAll('user-query-content, message-content');
    messages.forEach((msg, index) => {
        if (!msg.hasAttribute('data-fork-injected')) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'gemini-fork-container';
            btnContainer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 10px; padding-bottom: 5px;';

            const btn = document.createElement('button');
            btn.textContent = '✂️ פצל והוסף לצירוף';
            btn.style.cssText = 'background: #fbbc04; color: #202124; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: all 0.2s;';
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.textContent = '✓ התווסף לצירוף';
                btn.style.background = '#0f9d58';
                btn.style.color = 'white';
                executeExtraction(index, null);
                
                setTimeout(() => {
                    const container = msg.querySelector('.gemini-fork-container');
                    if (container) container.style.display = 'none';
                }, 800);
            });

            btnContainer.appendChild(btn);
            msg.appendChild(btnContainer);
            msg.setAttribute('data-fork-injected', 'true');
        }
    });
}

function executeExtraction(targetIndex = null, sendResponse = null) {
    try {
        const messages = document.querySelectorAll('user-query-content, message-content');
        if (messages.length === 0) {
            updateFloatStatus("השיחה ריקה.", "red");
            if(sendResponse) sendResponse({ success: false, error: "השיחה ריקה." });
            return;
        }

        let chatLog = "";
        const limit = targetIndex !== null ? targetIndex : messages.length - 1;

        for (let i = 0; i <= limit; i++) {
            const msg = messages[i];
            const isUser = msg.tagName.toLowerCase() === 'user-query-content';
            const prefix = isUser ? "משתמש:" : "Gemini:";
            
            const clone = msg.cloneNode(true);
            const containerToRemove = clone.querySelector('.gemini-fork-container');
            if (containerToRemove) clone.removeChild(containerToRemove);

            const text = clone.textContent.trim();
            if (text) {
                chatLog += `${prefix}\n${text}\n\n`;
            }
        }

        const MAX_LENGTH = 15000;
        let currentSnippetText = "";

        if (chatLog.length > MAX_LENGTH) {
            const truncatedLog = chatLog.substring(chatLog.length - MAX_LENGTH);
            currentSnippetText = "--- תחילת בלוק מידע (חלק אחרון בלבד עקב מגבלת אורך) ---\n\n" + truncatedLog + "\n--- סוף בלוק מידע ---";
        } else {
            currentSnippetText = "--- תחילת בלוק מידע ---\n\n" + chatLog + "\n--- סוף בלוק מידע ---";
        }

        chrome.storage.local.get(['accumulatedChats'], (result) => {
            const currentArray = result.accumulatedChats || [];
            currentArray.push(currentSnippetText);

            chrome.storage.local.set({ accumulatedChats: currentArray }, () => {
                updateFloatStatus("נשאב בהצלחה!", "green");
                if(sendResponse) sendResponse({ success: true });
            });
        });

    } catch (error) {
        updateFloatStatus("שגיאה בשאיבה.", "red");
        if(sendResponse) sendResponse({ success: false, error: "שגיאה פנימית." });
    }
}

// ==========================================
// 4. מנוע ההזרקה (Injection)
// ==========================================
function executeInjection(sendResponse) {
    try {
        chrome.storage.local.get(['accumulatedChats'], (result) => {
            const chats = result.accumulatedChats || [];
            if (chats.length === 0) {
                if(sendResponse) sendResponse({ success: false, error: "אין מידע צבור." });
                return;
            }

            const inputBox = document.querySelector('rich-textarea div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"]');
            if (!inputBox) {
                if(sendResponse) sendResponse({ success: false, error: "לא נמצאה תיבת קלט." });
                return;
            }

            let finalPrompt = "הוראת מערכת: אני מעביר לכאן מספר קטעי הקשר שונים שנשאבו קודם לכן לצורך איחוד, סנכרון ומיזוג ידע.\n" +
                              "המשימה שלך כעת:\n" +
                              "1. קרא את כל בלוקי המידע המצורפים מטה כדי להבין את מכלול הנושאים.\n" +
                              "2. אשר בקצרה שקיבלת את כל חלקי המידע, ואל תתחיל לפתור או לענות עדיין. חכה להנחיה הבאה שלי.\n\n" +
                              "====================================\n" +
                              "להלן ההקשרים שנצברו:\n" +
                              "====================================\n\n";

            finalPrompt += chats.join("\n\n====================================\n\n");

            inputBox.textContent = finalPrompt;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                const sendBtn = document.querySelector('button[aria-label="Send message"], button[aria-label="Send message to Gemini"]');
                if (sendBtn) sendBtn.click();
            }, 500);

            chrome.storage.local.remove(['accumulatedChats']);
            if(sendResponse) sendResponse({ success: true });
        });
    } catch (error) {
        if(sendResponse) sendResponse({ success: false, error: "שגיאה בהזרקה." });
    }
}