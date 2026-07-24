export type FieldType =
  | "username"
  | "current-password"
  | "new-password"
  | "one-time-code"
  | "unknown";

export interface ClassifiedField {
  element: HTMLInputElement;
  type: FieldType;
  score: number;
}

/**
 * Checks if an input element is visible, interactive, and eligible for autofill.
 */
export function isElementVisible(element: HTMLInputElement): boolean {
  if (
    !element ||
    element.type === "hidden" ||
    element.readOnly ||
    element.disabled
  ) {
    return false;
  }

  const inputType = element.type.toLowerCase();
  const nonLoginTypes = [
    "date",
    "datetime-local",
    "time",
    "month",
    "week",
    "search",
    "number",
    "range",
    "color",
    "file",
    "checkbox",
    "radio",
    "submit",
    "button",
    "reset",
    "image",
  ];
  if (nonLoginTypes.includes(inputType)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    style.pointerEvents === "none"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

/**
 * Classifies an HTMLInputElement into Username, Current Password, New Password, or OTP.
 * Returns 'unknown' for non-login inputs (like Search, Date pickers, Filters, Comments, etc.)
 */
export function classifyInputField(input: HTMLInputElement): FieldType {
  if (!isElementVisible(input)) return "unknown";

  const autocomplete = (input.getAttribute("autocomplete") || "")
    .toLowerCase()
    .trim();

  // Explicit non-login autocomplete attributes
  const nonLoginAutocompletes = [
    "off",
    "one-time-code-off",
    "bday",
    "bday-day",
    "bday-month",
    "bday-year",
    "street-address",
    "postal-code",
    "cc-number",
    "cc-csc",
    "cc-exp",
  ];
  if (nonLoginAutocompletes.includes(autocomplete)) {
    // Note: 'off' is often used on password inputs, so only treat 'off' as non-login if input is NOT a password
    if (autocomplete !== "off" || input.type.toLowerCase() !== "password") {
      // Continue check
    }
  }

  // 1. Standard W3C Autocomplete Attribute Check
  if (autocomplete === "username" || autocomplete === "email")
    return "username";
  if (autocomplete === "current-password") return "current-password";
  if (autocomplete === "new-password") return "new-password";
  if (autocomplete === "one-time-code") return "one-time-code";

  const inputType = input.type.toLowerCase();
  const name = (input.name || "").toLowerCase();
  const id = (input.id || "").toLowerCase();
  const placeholder = (input.placeholder || "").toLowerCase();
  const ariaLabel = (input.getAttribute("aria-label") || "").toLowerCase();
  const title = (input.title || "").toLowerCase();
  const className = (input.className || "").toLowerCase();
  const role = (input.getAttribute("role") || "").toLowerCase();

  const labelText = getAssociatedLabelText(input).toLowerCase();

  const combinedText = `${name} ${id} ${placeholder} ${ariaLabel} ${title} ${className} ${role} ${labelText}`;

  // 2. Exclude Date / Time / Calendar / Picker / Filter / Search / Non-login fields
  const exclusionPattern =
    /date|time|picker|calendar|daterange|period|khoảng|thời gian|ngày|tháng|năm|search|query|filter|searchbox|find|seek|coupon|promo|discount|voucher|captcha|comment|note|quantity|count|amount|price|address|city|state|zip|postal/i;

  if (exclusionPattern.test(combinedText) && inputType !== "password") {
    return "unknown";
  }

  // 3. Check for OTP / 2FA / Verification Code
  const otpPattern =
    /otp|2fa|totp|authenticator|verify|verification|one-time|code/i;
  if (otpPattern.test(combinedText)) {
    return "one-time-code";
  }

  // 4. Password Input Field Processing
  if (inputType === "password") {
    const isNewPass = /new|confirm|create|signup|register|change/i.test(
      combinedText
    );
    if (isNewPass) {
      return "new-password";
    }

    // Check if form contains multiple password fields (e.g. Current + New + Confirm)
    const form = input.form;
    if (form) {
      const formPasswords = Array.from(
        form.querySelectorAll("input[type='password']")
      );
      if (formPasswords.length > 1) {
        const passIndex = formPasswords.indexOf(input);
        if (passIndex > 0) {
          return "new-password";
        }
      }
    }

    return "current-password";
  }

  // 5. Username / Email / Account Field Processing
  if (inputType === "text" || inputType === "email" || inputType === "tel") {
    const isUsername =
      /user|username|email|login|account|member|identifier/i.test(combinedText);
    if (isUsername) {
      return "username";
    }

    if (/user|username|email|login|account/i.test(labelText)) {
      return "username";
    }
    if (/otp|2fa|totp|verification|code/i.test(labelText)) {
      return "one-time-code";
    }

    // Contextual preceding element inspection (input immediately before a password field)
    if (isPrecedingPassword(input)) {
      return "username";
    }
  }

  return "unknown";
}

/**
 * Gets associated label text for an input field.
 */
function getAssociatedLabelText(input: HTMLInputElement): string {
  let labelText = "";

  if (input.id) {
    try {
      const label = document.querySelector(
        `label[for='${CSS.escape(input.id)}']`
      );
      if (label) labelText += " " + label.textContent;
    } catch {
      // Ignore invalid CSS selector escapes
    }
  }

  const parentLabel = input.closest("label");
  if (parentLabel) {
    labelText += " " + parentLabel.textContent;
  }

  // Check closest fieldset or container legend/header
  const container = input.closest(".form-group, .input-group, fieldset, div");
  if (container) {
    const titleEl = container.querySelector("label, .label, legend, span");
    if (titleEl && titleEl !== input) {
      labelText += " " + titleEl.textContent;
    }
  }

  return labelText.trim();
}

/**
 * Checks if this input field precedes a password field in the DOM/form.
 */
function isPrecedingPassword(input: HTMLInputElement): boolean {
  const form = input.form;
  const container = form || document.body;
  const inputs = Array.from(container.querySelectorAll("input"));
  const inputIdx = inputs.indexOf(input);

  if (inputIdx !== -1 && inputIdx < inputs.length - 1) {
    for (let i = inputIdx + 1; i < Math.min(inputIdx + 3, inputs.length); i++) {
      if (inputs[i].type === "password") {
        return true;
      }
    }
  }
  return false;
}
