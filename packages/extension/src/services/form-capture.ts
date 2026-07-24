import { classifyInputField } from "./classifier";

export interface CapturedCredential {
  domain: string;
  username?: string;
  password?: string;
  isNewAccount: boolean;
}

type OnSubmitCallback = (cred: CapturedCredential) => void;

let registeredCallback: OnSubmitCallback | null = null;

/**
 * Initializes form submission capturing listeners on the document.
 */
export function initFormCapture(callback: OnSubmitCallback): void {
  registeredCallback = callback;

  // 1. Submit event listener on forms
  document.addEventListener(
    "submit",
    (e) => {
      const target = e.target as HTMLFormElement;
      if (target && target.tagName === "FORM") {
        captureFormValues(target);
      }
    },
    true
  );

  // 2. Click event listener on submit buttons
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const submitBtn = target.closest(
        "button[type='submit'], input[type='submit']"
      );
      if (submitBtn) {
        const form = submitBtn.closest("form");
        if (form) {
          captureFormValues(form as HTMLFormElement);
        } else {
          captureContainerValues(document.body);
        }
      }
    },
    true
  );

  // 3. Keydown Enter listener on password fields
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        const active = document.activeElement as HTMLInputElement;
        if (
          active &&
          active.tagName === "INPUT" &&
          active.type === "password"
        ) {
          const form = active.form;
          if (form) {
            captureFormValues(form);
          } else {
            captureContainerValues(document.body);
          }
        }
      }
    },
    true
  );
}

/**
 * Captures values from a specific HTMLFormElement.
 */
function captureFormValues(form: HTMLFormElement): void {
  captureContainerValues(form);
}

/**
 * Captures inputs inside a container element (form or body).
 */
function captureContainerValues(container: HTMLElement): void {
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>("input")
  );

  let username: string | undefined;
  let password: string | undefined;
  let newPassword: string | undefined;

  for (const input of inputs) {
    if (!input.value) continue;

    const classification = classifyInputField(input);

    if (classification === "username" && !username) {
      username = input.value;
    } else if (classification === "current-password" && !password) {
      password = input.value;
    } else if (classification === "new-password" && !newPassword) {
      newPassword = input.value;
    }
  }

  // Fallback check if username/password were not classified
  if (!username) {
    const textInput = inputs.find(
      (i) =>
        i.value &&
        i.type !== "password" &&
        i.type !== "submit" &&
        i.type !== "hidden"
    );
    if (textInput) username = textInput.value;
  }

  if (!password && !newPassword) {
    const passInput = inputs.find((i) => i.value && i.type === "password");
    if (passInput) password = passInput.value;
  }

  const finalPassword = newPassword || password;

  if (finalPassword && registeredCallback) {
    registeredCallback({
      domain: window.location.hostname,
      username,
      password: finalPassword,
      isNewAccount: Boolean(newPassword),
    });
  }
}
