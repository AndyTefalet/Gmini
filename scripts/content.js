// האזנה להודעות שמגיעות מה-Popup או מקבצים אחרים של התוסף
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "EXTRACT_AND_SAVE_CHAT") {
        try {
            // חיפוש המיכל המרכזי של היסטוריית השיחה
            const chatHistory = document.querySelector('#chat-history');
            
            if (!chatHistory) {
                sendResponse({ success: false, error: "לא נמצאה היסטוריית שיחה. ודא שאתה בתוך שיחה פעילה." });
                return true;
            }

            // שליפת כל ההודעות של המשתמש ושל המודל לפי התגיות הסמנטיות
            const messages = chatHistory.querySelectorAll('user-query-content, message-content');
            
            if (messages.length === 0) {
                sendResponse({ success: false, error: "השיחה ריקה. אין מה לשאוב." });
                return true;
            }

            // בניית הפרומפט שיעביר את ההקשר לשיחה החדשה
            let fullChatText = "אני מעביר לכאן שיחה זמנית שהתחלנו קודם. להלן ההקשר של מה שדיברנו עד כה. אל תענה על זה, רק תאשר שהבנת ונוכל להמשיך מאותה נקודה:\n\n";
            fullChatText += "--- תחילת היסטוריית שיחה ---\n\n";

            // מעבר על כל הבועות וסידור שלהן בטקסט
            messages.forEach((msg) => {
                const isUser = msg.tagName.toLowerCase() === 'user-query-content';
                const prefix = isUser ? "משתמש:" : "Gemini:";
                
                // שליפת הטקסט הברור מתוך האלמנט
                const text = msg.textContent.trim();
                
                if (text) {
                    fullChatText += `${prefix}\n${text}\n\n`;
                }
            });

            fullChatText += "--- סוף היסטוריית שיחה ---";

            // שמירת המידע שנשאב לזיכרון המקומי של התוסף
            chrome.storage.local.set({ 
                savedChatContext: fullChatText,
                pendingInjection: true // דגל שמסמן למערכת שיש שיחה שמחכה להזרקה
            }, () => {
                sendResponse({ success: true });
            });

        } catch (error) {
            console.error("Gemini Temp-to-Save Error:", error);
            sendResponse({ success: false, error: "שגיאה פנימית במהלך שאיבת הנתונים." });
        }
        
        // החזרת true הכרחית כדי להשאיר את ערוץ התקשורת פתוח לתשובה אסינכרונית
        return true; 
    }
});