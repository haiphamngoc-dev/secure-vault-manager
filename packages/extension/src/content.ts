interface CredentialItem {
  id: string;
  username?: string;
  password?: string;
}

let activeInput: HTMLInputElement | null = null;
let currentCredentials: CredentialItem[] = [];
let selectedIndex = -1;

// Escape HTML utility to prevent XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Perform Autofill helper
const performAutofill = (username: string, password: string): boolean => {
  const inputs = Array.from(document.querySelectorAll("input"));
  const passwordFields = inputs.filter((i) => i.type === "password");

  let filledUsername = false;
  let filledPassword = false;

  if (passwordFields.length > 0) {
    const passwordField = passwordFields[0];
    passwordField.value = password;
    passwordField.dispatchEvent(new Event("input", { bubbles: true }));
    passwordField.dispatchEvent(new Event("change", { bubbles: true }));
    filledPassword = true;

    // Try to find the username input
    // 1. Check in the same form
    const form = passwordField.form;
    if (form) {
      const formInputs = Array.from(form.querySelectorAll("input"));
      const usernameField = formInputs.find(
        (i) =>
          i.type !== "password" &&
          i.type !== "submit" &&
          i.type !== "button" &&
          i.type !== "checkbox" &&
          i.type !== "radio" &&
          i.type !== "hidden"
      );
      if (usernameField) {
        usernameField.value = username;
        usernameField.dispatchEvent(new Event("input", { bubbles: true }));
        usernameField.dispatchEvent(new Event("change", { bubbles: true }));
        filledUsername = true;
      }
    }

    // 2. If not found in form, find the input preceding the password field in the DOM
    if (!filledUsername) {
      const passIndex = inputs.indexOf(passwordField);
      for (let i = passIndex - 1; i >= 0; i--) {
        const input = inputs[i];
        if (
          input.type !== "password" &&
          input.type !== "submit" &&
          input.type !== "button" &&
          input.type !== "checkbox" &&
          input.type !== "radio" &&
          input.type !== "hidden"
        ) {
          input.value = username;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          filledUsername = true;
          break;
        }
      }
    }
  }

  // Fallback if no password field but we have inputs
  if (!filledUsername && !filledPassword && inputs.length > 0) {
    const usernameField = inputs.find(
      (i) =>
        i.type !== "password" &&
        i.type !== "submit" &&
        i.type !== "button" &&
        i.type !== "checkbox" &&
        i.type !== "radio" &&
        i.type !== "hidden"
    );
    if (usernameField) {
      usernameField.value = username;
      usernameField.dispatchEvent(new Event("input", { bubbles: true }));
      usernameField.dispatchEvent(new Event("change", { bubbles: true }));
      filledUsername = true;
    }
  }

  return filledUsername || filledPassword;
};

// Keydown handler on input field
const handleKeyDown = (e: KeyboardEvent) => {
  const dropdown = document.getElementById("__svm-extension-dropdown");
  if (!dropdown) return;

  if (e.key === "Escape") {
    removeDropdown();
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (e.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % currentCredentials.length;
    updateActiveItem();
    e.preventDefault();
    e.stopPropagation();
  } else if (e.key === "ArrowUp") {
    selectedIndex =
      (selectedIndex - 1 + currentCredentials.length) %
      currentCredentials.length;
    updateActiveItem();
    e.preventDefault();
    e.stopPropagation();
  } else if (e.key === "Enter") {
    if (selectedIndex >= 0 && selectedIndex < currentCredentials.length) {
      const cred = currentCredentials[selectedIndex];
      performAutofill(cred.username || "", cred.password || "");
      removeDropdown();
      e.preventDefault();
      e.stopPropagation();
    }
  }
};

// Update CSS active state and handle scroll view bounding
const updateActiveItem = () => {
  const dropdown = document.getElementById("__svm-extension-dropdown");
  if (!dropdown || !dropdown.shadowRoot) return;

  const items = dropdown.shadowRoot.querySelectorAll(".dropdown-item");
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add("active");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("active");
    }
  });
};

// Reposition dropdown dynamically
const repositionDropdown = () => {
  const dropdown = document.getElementById("__svm-extension-dropdown");
  if (dropdown && activeInput) {
    const rect = activeInput.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      removeDropdown();
      return;
    }
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
  }
};

// Safe remove dropdown
const removeDropdown = () => {
  const dropdown = document.getElementById("__svm-extension-dropdown");
  if (dropdown) {
    dropdown.remove();
  }
  if (activeInput) {
    activeInput.removeEventListener("keydown", handleKeyDown);
  }
  window.removeEventListener("scroll", repositionDropdown, true);
  window.removeEventListener("resize", repositionDropdown);
  activeInput = null;
  currentCredentials = [];
  selectedIndex = -1;
};

// Render dropdown in Shadow DOM
const showDropdown = (
  inputEl: HTMLInputElement,
  credentials: CredentialItem[]
) => {
  const rect = inputEl.getBoundingClientRect();
  const top = rect.bottom + window.scrollY;
  const left = rect.left + window.scrollX;
  const width = Math.max(250, rect.width);

  const container = document.createElement("div");
  container.id = "__svm-extension-dropdown";
  container.style.position = "absolute";
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
  container.style.width = `${width}px`;
  container.style.zIndex = "2147483647";

  const shadowRoot = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      --bg: #ffffff;
      --text-primary: #262626;
      --text-secondary: rgba(0, 0, 0, 0.55);
      --border: rgba(0, 0, 0, 0.08);
      --hover-bg: hsla(212, 100%, 50%, 0.08);
      --hover-text: #0c7df0;
      display: block;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --bg: #333333;
        --text-primary: #ffffff;
        --text-secondary: rgba(255, 255, 255, 0.65);
        --border: rgba(255, 255, 255, 0.12);
        --hover-bg: hsla(212, 100%, 50%, 0.24);
        --hover-text: #85c2ff;
      }
    }
    .dropdown-wrapper {
      background-color: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 6px;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    .dropdown-header {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .logo-text {
      color: var(--hover-text);
      font-weight: 700;
      font-size: 11px;
      font-family: Outfit, sans-serif;
    }
    .dropdown-list {
      max-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .dropdown-list::-webkit-scrollbar {
      width: 4px;
    }
    .dropdown-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .dropdown-list::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 2px;
    }
    .dropdown-item {
      padding: 8px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: background-color 100ms ease, transform 100ms ease;
    }
    .dropdown-item:hover, .dropdown-item.active {
      background-color: var(--hover-bg);
    }
    .dropdown-item:active {
      transform: scale(0.98);
    }
    .item-icon {
      font-size: 16px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
    }
    .item-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .item-username {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-secondary {
      font-size: 10px;
      color: var(--text-secondary);
    }
    .dropdown-item:hover .item-username, .dropdown-item.active .item-username {
      color: var(--hover-text);
    }
  `;

  const html = `
    <div class="dropdown-wrapper">
      <div class="dropdown-header">
        <div class="logo-container">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--hover-text);">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span class="logo-text">Secure Vault Manager</span>
        </div>
      </div>
      <div class="dropdown-list">
        ${credentials
          .map(
            (cred, index) => `
          <div class="dropdown-item" data-index="${index}">
            <div class="item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="item-info">
              <div class="item-username">${escapeHtml(cred.username || "No username")}</div>
              <div class="item-secondary">Click to autofill</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  shadowRoot.appendChild(style);

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  shadowRoot.appendChild(tempDiv.firstElementChild!);

  document.body.appendChild(container);

  // Click handler
  shadowRoot.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(item.getAttribute("data-index") || "0", 10);
      const cred = credentials[index];
      if (cred) {
        performAutofill(cred.username || "", cred.password || "");
      }
      removeDropdown();
    });
  });

  // Attach global events
  window.addEventListener("scroll", repositionDropdown, true);
  window.addEventListener("resize", repositionDropdown);

  // Keyboard navigation on input
  inputEl.addEventListener("keydown", handleKeyDown);

  selectedIndex = -1;
};

// Initialize dropdown flow
const initDropdown = async (inputEl: HTMLInputElement) => {
  if (
    activeInput === inputEl &&
    document.getElementById("__svm-extension-dropdown")
  ) {
    return;
  }

  removeDropdown();

  activeInput = inputEl;
  const domain = window.location.hostname;
  if (!domain) return;

  chrome.runtime.sendMessage({ type: "CHECK_STATUS" }, (statusResponse) => {
    if (!statusResponse || statusResponse.status === "error") return;
    if (statusResponse.paired && !statusResponse.locked) {
      chrome.runtime.sendMessage(
        { type: "GET_CREDENTIALS", domain },
        (credsResponse) => {
          if (!credsResponse || credsResponse.status === "error") return;
          const credentials = credsResponse.data || [];
          if (credentials.length > 0) {
            currentCredentials = credentials;
            showDropdown(inputEl, credentials);
          }
        }
      );
    }
  });
};

// Trigger init on click or focus
const handleTrigger = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target && target.tagName === "INPUT") {
    const type = target.type.toLowerCase();
    if (type === "text" || type === "email" || type === "password") {
      initDropdown(target);
    }
  }
};

document.addEventListener("focusin", handleTrigger);
document.addEventListener("click", handleTrigger);

// Global click outside listener
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const dropdown = document.getElementById("__svm-extension-dropdown");
  if (dropdown && target !== activeInput && !dropdown.contains(target)) {
    removeDropdown();
  }
});

// Extension runtime listener for toolbar popup-driven autofills
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "AUTOFILL") {
    const success = performAutofill(
      request.username || "",
      request.password || ""
    );
    sendResponse({ success });
  }
});
