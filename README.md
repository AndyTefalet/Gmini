# Gemini-Temp-to-Save-Extension

**Goal:** To enable a smooth transition of a conversation from "history off" mode to "saved" mode in the Gemini web interface, while maintaining the logical sequence of the context.

**Task:** Developing a browser extension (Chrome Extension) that bridges the lack of an API for retroactive saving on Google's servers. The extension will perform a scan and extraction of the conversation data from the screen, save it temporarily, and inject it into a new tab with an active history.

### **Architecture and Technologies (How):**

* **Runtime Environment:** Google Chrome Extensions API (Manifest V3).
* **Client Side (UI):** A basic popup window in HTML/CSS with an activation button.
* **Logic (JavaScript):**
* **Content Script:** Scanning the DOM to extract text from the semantic tags (`<user-query-content>`, `<message-content>`), and injecting it into the text box on the new page.
* **Background Script (Service Worker):** Managing the opening of new tabs.
* **chrome.storage.local:** State Management in the local memory to transfer information between the old page and the new one.

---

### **Project Execution Phases**

**Phase 1: Setup & Manifest**
Creating the project folder and defining the `manifest.json` file. Configuring the required permissions for the extension to run on the `gemini.google.com` domain and access local storage.

**Phase 2: Popup UI Development**
Creating the `popup.html` and `popup.js` files. Developing a minimalist interface that includes a central action button that listens for the user's click and initiates the process.

**Phase 3: Data Extraction**
Writing the `content.js`. Developing the logic that reads the elements from `#chat-history`, filters out irrelevant content, and formats the back-and-forth messages into a single, clear, and readable text block.

**Phase 4: State Management**
Implementing the save functions to `chrome.storage.local`. Verifying that the text is successfully saved after extraction, accompanied by a boolean flag that signals to the system that there is currently a "conversation waiting to be injected."

**Phase 5: Data Injection Mechanism**
Expanding the `content.js` so that it detects the loading of a new Gemini tab. If there is a conversation waiting in memory, the script will concatenate the opening text (the pre-defined constant prompt), plant the information into the input field, and simulate a click on the send button. Afterward, the memory will be cleared.

**Phase 6: Debugging and Running (QA)**
Loading the extension in the browser in Developer Mode. Performing tests on conversations of varying lengths, ensuring resilience to loading times (e.g., waiting until the text box exists in the DOM before injection), and handling errors.

**Phase 7: Packaging, Publishing, and Distribution**
Finalizing the project code. Writing a precise, technical marketing message that presents the problem the extension solves, alongside a link to the ZIP file on GitHub or the extension store, for distribution in WhatsApp groups of developers and tech professionals.
