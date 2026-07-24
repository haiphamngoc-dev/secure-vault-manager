import { classifyInputField, isElementVisible } from "./classifier";

/**
 * Fills an input element using prototype setters to ensure React/Vue/Angular state binding updates.
 */
export function fillInputValue(input: HTMLInputElement, value: string): void {
  if (!input || !isElementVisible(input)) return;

  // Focus element first
  input.focus();

  // Use Native prototype setter to bypass React 16+ synthetic event overrides
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }

  // Dispatch full sequence of synthetic events
  input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
}

/**
 * Copies text to the system clipboard securely.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn(
      "[SVM Extension] Clipboard API failed, attempting execCommand fallback:",
      err
    );
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}

/**
 * Auto-fills credentials and TOTP into the current page.
 */
export function performSmartAutofill(
  username?: string,
  password?: string,
  totpCode?: string
): { usernameFilled: boolean; passwordFilled: boolean; totpFilled: boolean } {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>("input")
  );
  let usernameFilled = false;
  let passwordFilled = false;
  let totpFilled = false;

  let usernameInput: HTMLInputElement | null = null;
  let passwordInput: HTMLInputElement | null = null;
  let totpInput: HTMLInputElement | null = null;

  for (const input of inputs) {
    const classification = classifyInputField(input);

    if (classification === "username" && !usernameInput) {
      usernameInput = input;
    } else if (classification === "current-password" && !passwordInput) {
      passwordInput = input;
    } else if (classification === "one-time-code" && !totpInput) {
      totpInput = input;
    }
  }

  // Fallback heuristic if no fields classified
  if (!usernameInput && username) {
    usernameInput =
      inputs.find(
        (i) =>
          isElementVisible(i) &&
          i.type !== "password" &&
          i.type !== "submit" &&
          i.type !== "button"
      ) || null;
  }

  if (!passwordInput && password) {
    passwordInput =
      inputs.find((i) => isElementVisible(i) && i.type === "password") || null;
  }

  // Perform filling
  if (username && usernameInput) {
    fillInputValue(usernameInput, username);
    usernameFilled = true;
  }

  if (password && passwordInput) {
    fillInputValue(passwordInput, password);
    passwordFilled = true;
  }

  if (totpCode) {
    if (totpInput) {
      fillInputValue(totpInput, totpCode);
      totpFilled = true;
    }
    // Always copy TOTP code to Clipboard as fallback as decided in design alignment
    copyToClipboard(totpCode);
  }

  return { usernameFilled, passwordFilled, totpFilled };
}
