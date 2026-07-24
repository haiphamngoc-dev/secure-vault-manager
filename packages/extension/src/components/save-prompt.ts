import { CapturedCredential } from "../services/form-capture";

/**
 * Renders an isolated Shadow DOM floating banner prompting the user to save credentials.
 */
export function showSaveCredentialPrompt(
  cred: CapturedCredential,
  onSave: (cred: CapturedCredential) => void,
  onDismiss: () => void
): void {
  // Remove existing prompt if any
  const existingHost = document.getElementById("__svm-save-prompt-host");
  if (existingHost) {
    existingHost.remove();
  }

  const host = document.createElement("div");
  host.id = "__svm-save-prompt-host";
  host.style.position = "fixed";
  host.style.top = "16px";
  host.style.right = "16px";
  host.style.zIndex = "2147483647"; // Max z-index
  host.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const shadowRoot = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    .prompt-card {
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 12px;
      padding: 16px 20px;
      width: 320px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 14px;
      color: #cba6f7;
    }
    .header svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }
    .info-box {
      background: #181825;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      color: #a6adc8;
    }
    .info-val {
      color: #f5e0dc;
      font-weight: 500;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 4px;
    }
    .btn {
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-cancel {
      background: #313244;
      color: #a6adc8;
    }
    .btn-cancel:hover {
      background: #45475a;
      color: #cdd6f4;
    }
    .btn-save {
      background: #89b4fa;
      color: #11111b;
    }
    .btn-save:hover {
      background: #b4befe;
    }
  `;

  const container = document.createElement("div");
  container.className = "prompt-card";

  const safeDomain = escapeHtml(cred.domain);
  const safeUser = escapeHtml(cred.username || "Tài khoản không tên");

  container.innerHTML = `
    <div class="header">
      <svg viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span>${cred.isNewAccount ? "Tạo tài khoản mới?" : "Lưu mật khẩu vào Vault?"}</span>
    </div>
    <div class="info-box">
      <div class="info-row">
        <span>Trang web:</span>
        <span class="info-val">${safeDomain}</span>
      </div>
      <div class="info-row">
        <span>Tài khoản:</span>
        <span class="info-val">${safeUser}</span>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-cancel" id="btn-dismiss">Không phải lúc này</button>
      <button class="btn btn-save" id="btn-save">Lưu vào Vault</button>
    </div>
  `;

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(container);
  document.body.appendChild(host);

  const btnDismiss = container.querySelector("#btn-dismiss");
  const btnSave = container.querySelector("#btn-save");

  btnDismiss?.addEventListener("click", () => {
    host.remove();
    onDismiss();
  });

  btnSave?.addEventListener("click", () => {
    host.remove();
    onSave(cred);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
