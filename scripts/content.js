// האזנה להודעות שמגיעות מה-Popup או מקבצים אחרים של התוסף
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // ==========================================
    // פעולה 1: שאיבת השיחה הישנה
    // ==========================================
    if (request.action === "EXTRACT_AND_SAVE_CHAT") {
        try {
            const chatHistory = document.querySelector('#chat-history');
            
            if (!chatHistory) {
                sendResponse({ success: false, error: "לא נמצאה היסטוריית שיחה. ודא שאתה בתוך שיחה פעילה." });
                return true;
            }

            const messages = chatHistory.querySelectorAll('user-query-content, message-content');
            
            if (messages.length === 0) {
                sendResponse({ success: false, error: "השיחה ריקה. אין מה לשאוב." });
                return true;
            }

            let fullChatText = "אני מעביר לכאן שיחה זמנית שהתחלנו קודם. להלן ההקשר של מה שדיברנו עד כה. אל תענה על זה, רק תאשר שהבנת ונוכל להמשיך מאותה נקודה:\n\n";
            fullChatText += "--- תחילת היסטוריית שיחה ---\n\n";

            messages.forEach((msg) => {
                const isUser = msg.tagName.toLowerCase() === 'user-query-content';
                const prefix = isUser ? "משתמש:" : "Gemini:";
                
                const text = msg.textContent.trim();
                
                if (text) {
                    fullChatText += `${prefix}\n${text}\n\n`;
                }
            });

            fullChatText += "--- סוף היסטוריית שיחה ---";

            chrome.storage.local.set({ 
                savedChatContext: fullChatText,
                pendingInjection: true 
            }, () => {
                sendResponse({ success: true });
            });

        } catch (error) {
            console.error("Gemini Temp-to-Save Error:", error);
            sendResponse({ success: false, error: "שגיאה פנימית במהלך שאיבת הנתונים." });
        }
        
        return true; 
    }

    // ==========================================
    // פעולה 2: הזרקת השיחה בחלון החדש
    // ==========================================
    if (request.action === "INJECT_SAVED_CHAT") {
        try {
            chrome.storage.local.get(['savedChatContext', 'pendingInjection'], (result) => {
                if (!result.pendingInjection || !result.savedChatContext) {
                    sendResponse({ success: false, error: "אין מידע בזיכרון." });
                    return;
                }

                const inputBox = document.querySelector('rich-textarea div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"]');
                
                if (!inputBox) {
                    sendResponse({ success: false, error: "לא נמצאה תיבת הקלט. ודא שאתה בעמוד שיחה חדשה." });
                    return;
                }

                inputBox.textContent = result.savedChatContext;
                
                inputBox.dispatchEvent(new Event('input', { bubbles: true }));

                setTimeout(() => {
                    const sendBtn = document.querySelector('button[aria-label="Send message"], button[aria-label="Send message to Gemini"]');
                    if (sendBtn) {
                        sendBtn.click();
                    } else {
                        console.warn("Send button not found, context injected but not sent.");
                    }
                }, 500);

                chrome.storage.local.remove(['savedChatContext', 'pendingInjection']);
                sendResponse({ success: true });
            });
        } catch (error) {
            console.error("Injection Error:", error);
            sendResponse({ success: false, error: "שגיאה בתהליך ההזרקה." });
        }
        
        return true;
    }
});