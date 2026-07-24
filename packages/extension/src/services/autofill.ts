import { classifyInputField, isElementVisible } from "./classifier";

function dispatchKeyEvents(element: HTMLInputElement): void {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true })
  );
  element.dispatchEvent(
    new KeyboardEvent("keypress", { bubbles: true, cancelable: true })
  );
  element.dispatchEvent(
    new KeyboardEvent("keyup", { bubbles: true, cancelable: true })
  );
}

/**
 * Fills an input element using prototype setters to ensure React/Vue/Angular state binding updates.
 * Dispatches key events before and after setting the value, replicating actual user typing.
 */
export function fillInputValue(input: HTMLInputElement, value: string): void {
  if (!input || !isElementVisible(input)) return;

  // 1. Click and focus
  if (input.type !== "checkbox") {
    try {
      input.click();
    } catch {
      // Ignore click failures
    }
  }
  input.focus();

  // 2. Dispatch keyboard events before filling (down/press/up)
  dispatchKeyEvents(input);

  // 3. Set value using Native prototype setter to bypass React synthetic event overrides
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }

  // 4. Dispatch keyboard events after filling (down/press/up)
  dispatchKeyEvents(input);

  // 5. Dispatch input and change events
  input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));

  // 6. Blur physical element to trigger page validators
  input.blur();
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
          i.type !== "button" &&
          !["one-time-code", "current-password", "new-password"].includes(
            classifyInputField(i)
          )
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
    // Detect segmented inputs
    const visibleInputs = inputs.filter(isElementVisible);
    const startIndex = totpInput ? visibleInputs.indexOf(totpInput) : -1;

    const segmentedInputs: HTMLInputElement[] = [];
    if (startIndex !== -1) {
      for (let i = startIndex; i < visibleInputs.length; i++) {
        const input = visibleInputs[i];
        const type = input.type.toLowerCase();
        const isTextLike =
          type === "text" ||
          type === "tel" ||
          type === "number" ||
          type === "password";

        if (!isTextLike) break;

        if (i > startIndex) {
          const prevInput = visibleInputs[i - 1];
          const sameForm = input.form === prevInput.form;
          const sameParent =
            input.parentElement === prevInput.parentElement ||
            input.closest("div") === prevInput.closest("div");
          if (!sameForm && !sameParent) break;

          const prevMaxLength =
            prevInput.getAttribute("maxlength") ||
            prevInput.getAttribute("maxLength");
          const currMaxLength =
            input.getAttribute("maxlength") || input.getAttribute("maxLength");
          if (prevMaxLength === "1" && currMaxLength !== "1") {
            break;
          }
        }
        segmentedInputs.push(input);
      }
    }

    // Fill segmented inputs if there are multiple inputs matching totpCode length or they are maxlength="1"
    if (
      segmentedInputs.length > 1 &&
      (segmentedInputs.length === totpCode.length ||
        segmentedInputs.every(
          (i) =>
            i.getAttribute("maxlength") === "1" ||
            i.getAttribute("maxLength") === "1"
        ))
    ) {
      const fillLength = Math.min(segmentedInputs.length, totpCode.length);
      for (let i = 0; i < fillLength; i++) {
        fillInputValue(segmentedInputs[i], totpCode[i]);
      }
      totpFilled = fillLength > 0;
    } else if (totpInput) {
      // Standard single input fill
      fillInputValue(totpInput, totpCode);
      totpFilled = true;
    }

    // Always copy TOTP code to Clipboard as fallback as decided in design alignment
    copyToClipboard(totpCode);
  }

  return { usernameFilled, passwordFilled, totpFilled };
}
