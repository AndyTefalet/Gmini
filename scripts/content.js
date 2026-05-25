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

// פונקציה להזרקת כפתורי פיצול לתוך העמוד של גוגל
function injectForkButtons() {
    const messages = document.querySelectorAll('user-query-content, message-content');
    
    messages.forEach((msg, index) => {
        // מונע הזרקה כפולה של כפתורים לאותה בועה
        if (!msg.hasAttribute('data-fork-injected')) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'gemini-fork-container';
            btnContainer.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 10px; padding-bottom: 5px;';

            const btn = document.createElement('button');
            btn.textContent = '✂️ פצל שיחה מנקודה זו';
            btn.style.cssText = 'background: #fbbc04; color: #202124; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: all 0.2s;';
            
            btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // שינוי עיצוב הכפתור לחיווי חזותי
                btn.textContent = '✓ נשאב לזיכרון';
                btn.style.background = '#0f9d58';
                btn.style.color = 'white';
                executeExtraction(index, null);
                
                // הסתרת כל כפתורי הפיצול לאחר פעולה
                document.querySelectorAll('.gemini-fork-container').forEach(c => c.style.display = 'none');
                alert("השיחה נשאבה עד לנקודה זו ונשמרה בזיכרון! כעת פתח שיחה חדשה ולחץ על הזרק מהתוסף.");
            });

            btnContainer.appendChild(btn);
            msg.appendChild(btnContainer);
            msg.setAttribute('data-fork-injected', 'true');
        }
    });
}

// פונקציית החילוץ (תומכת גם בחילוץ מלא וגם בחילוץ עד אינדקס מסוים)
function executeExtraction(targetIndex = null, sendResponse = null) {
    try {
        const messages = document.querySelectorAll('user-query-content, message-content');
        if (messages.length === 0) {
            if(sendResponse) sendResponse({ success: false, error: "השיחה ריקה." });
            return;
        }

        let chatLog = "";
        const limit = targetIndex !== null ? targetIndex : messages.length - 1;

        for (let i = 0; i <= limit; i++) {
            const msg = messages[i];
            const isUser = msg.tagName.toLowerCase() === 'user-query-content';
            const prefix = isUser ? "משתמש:" : "Gemini:";
            
            // שכפול האלמנט כדי להסיר את כפתור הפיצול מתוך הטקסט הנשאב
            const clone = msg.cloneNode(true);
            const containerToRemove = clone.querySelector('.gemini-fork-container');
            if (containerToRemove) clone.removeChild(containerToRemove);

            const text = clone.textContent.trim();
            if (text) {
                chatLog += `${prefix}\n${text}\n\n`;
            }
        }

        const MAX_LENGTH = 15000;
        let fullChatText = "";

        if (chatLog.length > MAX_LENGTH) {
            const truncatedLog = chatLog.substring(chatLog.length - MAX_LENGTH);
            fullChatText = "הוראת מערכת: אני מעביר לכאן שיחה זמנית שהתחלנו קודם. שים לב: השיחה המקורית הייתה ארוכה מדי ולכן הועבר אליך רק החלק האחרון שלה.\n" +
                           "המשימה שלך כעת:\n" +
                           "1. עדכן אותי שהשיחה נחתכה ושקיבלת רק את סופה.\n" +
                           "2. שאל אותי עד 3 שאלות קצרות וממוקדות כדי להבין מה היה ההקשר בחלק החסר ואיך תרצה להמשיך.\n\n" +
                           "--- תחילת היסטוריית שיחה (חלק אחרון בלבד) ---\n\n" +
                           truncatedLog +
                           "\n--- סוף היסטוריית שיחה ---";
        } else {
            fullChatText = "אני מעביר לכאן שיחה זמנית שהתחלנו קודם. להלן ההקשר של מה שדיברנו עד כה. אל תענה על זה, רק תאשר שהבנת ונוכל להמשיך מאותה נקודה:\n\n" +
                           "--- תחילת היסטוריית שיחה ---\n\n" +
                           chatLog +
                           "\n--- סוף היסטוריית שיחה ---";
        }

        chrome.storage.local.set({ 
            savedChatContext: fullChatText,
            pendingInjection: true 
        }, () => {
            if(sendResponse) sendResponse({ success: true });
        });

    } catch (error) {
        console.error("Gemini Temp-to-Save Error:", error);
        if(sendResponse) sendResponse({ success: false, error: "שגיאה פנימית." });
    }
}

// פונקציית ההזרקה (ללא שינוי מלבד המעטפת)
function executeInjection(sendResponse) {
    try {
        chrome.storage.local.get(['savedChatContext', 'pendingInjection'], (result) => {
            if (!result.pendingInjection || !result.savedChatContext) {
                sendResponse({ success: false, error: "אין מידע בזיכרון." });
                return;
            }

            const inputBox = document.querySelector('rich-textarea div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"]');
            if (!inputBox) {
                sendResponse({ success: false, error: "לא נמצאה תיבת הקלט." });
                return;
            }

            inputBox.textContent = result.savedChatContext;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                const sendBtn = document.querySelector('button[aria-label="Send message"], button[aria-label="Send message to Gemini"]');
                if (sendBtn) sendBtn.click();
            }, 500);

            chrome.storage.local.remove(['savedChatContext', 'pendingInjection']);
            sendResponse({ success: true });
        });
    } catch (error) {
        console.error("Injection Error:", error);
        sendResponse({ success: false, error: "שגיאה בתהליך ההזרקה." });
    }
}