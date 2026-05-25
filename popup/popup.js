document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const statusMsg = document.getElementById('status-msg');

    saveBtn.addEventListener('click', async () => {
        // עדכון ממשק למצב טעינה
        statusMsg.textContent = "סורק את השיחה...";
        statusMsg.style.color = "#1a73e8";
        saveBtn.disabled = true;

        try {
            // שליפת הכרטיסייה הפעילה כרגע בדפדפן
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // וידוא שהמשתמש אכן נמצא באתר של Gemini
            if (!tab.url.includes("gemini.google.com")) {
                showStatus("שגיאה: פתח את Gemini תחילה.", "red");
                return;
            }

            // שליחת הודעה ל-content.js כדי שיתחיל את שאיבת הנתונים
            chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_AND_SAVE_CHAT" }, (response) => {
                // טיפול בשגיאת תקשורת (למשל אם העמוד עדיין לא נטען לגמרי)
                if (chrome.runtime.lastError) {
                    showStatus("שגיאת תקשורת. אנא רענן את עמוד ה-Gemini ונסה שוב.", "red");
                    return;
                }

                // בדיקת התשובה שחזרה מקריאת הנתונים
                if (response && response.success) {
                    showStatus("השיחה נשאבה בהצלחה! פתח שיחה חדשה.", "green");
                    saveBtn.textContent = "הושלם";
                } else {
                    showStatus(response.error || "לא נמצאה שיחה לשאיבה.", "red");
                }
            });
        } catch (error) {
            showStatus("אירעה שגיאת מערכת.", "red");
        }
    });

    // פונקציית עזר להצגת הודעות
    function showStatus(text, color) {
        statusMsg.textContent = text;
        statusMsg.style.color = color;
        saveBtn.disabled = false;
    }
});