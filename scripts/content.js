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
            
            btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';

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

        // ניהול המערך בזיכרון המקומי
        chrome.storage.local.get(['accumulatedChats'], (result) => {
            const currentArray = result.accumulatedChats || [];
            currentArray.push(currentSnippetText);

            chrome.storage.local.set({ accumulatedChats: currentArray }, () => {
                if(sendResponse) sendResponse({ success: true });
            });
        });

    } catch (error) {
        console.error("Gemini Temp-to-Save Error:", error);
        if(sendResponse) sendResponse({ success: false, error: "שגיאה פנימית." });
    }
}

function executeInjection(sendResponse) {
    try {
        chrome.storage.local.get(['accumulatedChats'], (result) => {
            const chats = result.accumulatedChats || [];
            if (chats.length === 0) {
                sendResponse({ success: false, error: "אין מידע צבור בזיכרון." });
                return;
            }

            const inputBox = document.querySelector('rich-textarea div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"]');
            if (!inputBox) {
                sendResponse({ success: false, error: "לא נמצאה תיבת הקלט. ודא שפתחת שיחה חדשה." });
                return;
            }

            // הנדסת פרומפט להזרקה מרובת קטעים
            let finalPrompt = "הוראת מערכת: אני מעביר לכאן מספר קטעי הקשר שונים שנשאבו קודם לכן לצורך איחוד, סנכרון ומיזוג ידע.\n" +
                              "המשימה שלך כעת:\n" +
                              "1. קרא את כל בלוקי המידע המצורפים מטה כדי להבין את מכלול הנושאים.\n" +
                              "2. אשר בקצרה שקיבלת את כל חלקי המידע, ואל תתחיל לפתור או לענות עדיין. חכה להנחיה הבאה שלי.\n\n" +
                              "====================================\n" +
                              "להלן ההקשרים שנצברו:\n" +
                              "====================================\n\n";

            // חיבור כל קטעי השיחה עם מפריד ברור
            finalPrompt += chats.join("\n\n====================================\n\n");

            inputBox.textContent = finalPrompt;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                const sendBtn = document.querySelector('button[aria-label="Send message"], button[aria-label="Send message to Gemini"]');
                if (sendBtn) sendBtn.click();
            }, 500);

            // ניקוי הזיכרון לאחר ההזרקה המושלמת
            chrome.storage.local.remove(['accumulatedChats']);
            sendResponse({ success: true });
        });
    } catch (error) {
        console.error("Injection Error:", error);
        sendResponse({ success: false, error: "שגיאה בתהליך ההזרקה." });
    }
}