chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "AUTOFILL") {
    const inputs = Array.from(document.querySelectorAll("input"));
    const passwordFields = inputs.filter((i) => i.type === "password");

    let filledUsername = false;
    let filledPassword = false;

    if (passwordFields.length > 0) {
      const passwordField = passwordFields[0];
      passwordField.value = request.password;
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
          usernameField.value = request.username;
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
            input.value = request.username;
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
        usernameField.value = request.username;
        usernameField.dispatchEvent(new Event("input", { bubbles: true }));
        usernameField.dispatchEvent(new Event("change", { bubbles: true }));
        filledUsername = true;
      }
    }

    sendResponse({ success: filledUsername || filledPassword });
  }
});
