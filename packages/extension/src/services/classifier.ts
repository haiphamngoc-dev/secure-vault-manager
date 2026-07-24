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
 * Normalizes text by converting to lowercase, removing Vietnamese accents,
 * and stripping non-alphanumeric characters (including spaces, punctuation, hyphens).
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, ""); // Strip non-alphanumeric
}

const OTP_NAME_KEYWORDS = [
  "otp",
  "otc",
  "mfa",
  "2fa",
  "totpin",
  "validation_code",
  "totp",
  "totpcode",
  "2facode",
  "approvals_code",
  "code",
  "mfacode",
  "otc-code",
  "otp-code",
  "otpcode",
  "pin",
  "security_code",
  "twofactor",
  "twofa",
  "twofactorcode",
  "verificationcode",
];

const OTP_LABEL_KEYWORDS = [
  "onetimepassword",
  "onetimepasscode",
  "authenticationcode",
  "twofactorcode",
  "enter6digitcode",
  "validationcode",
  "mfacode",
  "securitycode",
  "enter7digitcode",
  "xxxxxx",
  "maxacthuc",
  "maxacminh",
  "mabaomat",
  "maotp",
  "ma2fa",
  "maxacnhan",
  "xacthuc",
  "xacminh",
];

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
  const pattern = input.getAttribute("pattern") || "";

  const labelText = getAssociatedLabelText(input);

  const combinedText =
    `${name} ${id} ${placeholder} ${ariaLabel} ${title} ${className} ${role} ${labelText}`.toLowerCase();

  // 2. Exclude Date / Time / Calendar / Picker / Filter / Search / Non-login fields
  const exclusionPattern =
    /date|(?<!one-?)\btime\b|picker|calendar|daterange|period|khoảng|thời gian|ngày|tháng|năm|search|query|filter|searchbox|find|seek|coupon|promo|discount|voucher|giảm giá|khuyến mãi|tìm kiếm|captcha|comment|note|quantity|count|amount|price|address|city|state|zip|postal|bưu chính|bưu điện/i;

  if (exclusionPattern.test(combinedText) && inputType !== "password") {
    return "unknown";
  }

  // 3. OTP Checks (inspired by 1Password)
  const normName = normalizeText(name);
  const normId = normalizeText(id);
  const normPlaceholder = normalizeText(placeholder);
  const normAriaLabel = normalizeText(ariaLabel);
  const normLabel = normalizeText(labelText);
  const normClassName = normalizeText(className);

  const hasOtpAutocomplete = autocomplete === "one-time-code";
  const hasOtpPattern = /\\d\{[4-8]\}|\[0-9\]\{[4-8]\}/.test(pattern);
  const hasOtpClassName = /totp|otpinput|optinput|otp-field/.test(
    normClassName
  );
  const hasOtpName = OTP_NAME_KEYWORDS.some(
    (kw) => normName.includes(kw) || normId.includes(kw)
  );
  const hasOtpLabelText = OTP_LABEL_KEYWORDS.some(
    (kw) =>
      normPlaceholder.includes(kw) ||
      normAriaLabel.includes(kw) ||
      normLabel.includes(kw)
  );

  if (
    hasOtpAutocomplete ||
    hasOtpPattern ||
    hasOtpClassName ||
    hasOtpName ||
    hasOtpLabelText
  ) {
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

    if (/user|username|email|login|account/i.test(labelText.toLowerCase())) {
      return "username";
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

  // 1. Label by for attribute
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

  // 2. Label by aria-labelledby attribute
  const ariaLabelledBy = input.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    ariaLabelledBy.split(/\s+/).forEach((id) => {
      if (id) {
        try {
          const label = document.querySelector(`#${CSS.escape(id)}`);
          if (label) labelText += " " + label.textContent;
        } catch {
          // Ignore
        }
      }
    });
  }

  // 3. Closest label parent
  const parentLabel = input.closest("label");
  if (parentLabel) {
    labelText += " " + parentLabel.textContent;
  }

  // 4. Previous element sibling if it is a label
  if (
    input.previousElementSibling &&
    input.previousElementSibling.tagName === "LABEL"
  ) {
    labelText += " " + input.previousElementSibling.textContent;
  }

  // 5. Container legend or header label as fallback
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
