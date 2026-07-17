import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import classes from "./popup.module.css";
import {
  IconLock,
  IconRefresh,
  IconPlugConnectedX,
  IconLoader2,
} from "@tabler/icons-react";

interface CredentialItem {
  id: string;
  username?: string;
  password?: string;
}

function Popup() {
  const [isChecking, setIsChecking] = useState(true);
  const [paired, setPaired] = useState(false);
  const [locked, setLocked] = useState(true);
  const [domain, setDomain] = useState("");
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      const theme = e.matches ? "dark" : "light";
      document.body.setAttribute("data-theme", theme);
    };

    updateTheme(mediaQuery);
    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [pairingInput, setPairingInput] = useState("");
  const [error, setError] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [desktopRunning, setDesktopRunning] = useState(true);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) return;

    setUnlockLoading(true);
    setError("");

    chrome.runtime.sendMessage(
      { type: "UNLOCK_VAULT", password: unlockPassword },
      (response) => {
        setUnlockLoading(false);
        if (!response || response.status === "error") {
          setError(response?.message || "Failed to unlock vault.");
        } else {
          setUnlockPassword("");
          setLocked(false);
          if (domain) {
            getCredentials(domain);
          }
        }
      }
    );
  };

  const handleTriggerBiometrics = () => {
    setUnlockLoading(true);
    setError("");
    chrome.runtime.sendMessage({ type: "TRIGGER_BIOMETRICS" }, (response) => {
      setUnlockLoading(false);
      if (!response || response.status === "error") {
        setError(response?.message || "Biometrics authentication failed.");
      } else {
        setLocked(false);
        if (domain) {
          getCredentials(domain);
        }
      }
    });
  };

  const handleCancelUnlock = () => {
    setUnlockPassword("");
    setError("");
  };

  const checkStatus = async () => {
    setError("");
    chrome.runtime.sendMessage({ type: "CHECK_STATUS" }, (response) => {
      setIsChecking(false);
      if (!response || response.status === "error") {
        const msg =
          response?.message || "Cannot connect to desktop application.";
        if (
          msg.includes("pairing key") ||
          msg.includes("pairing token") ||
          msg.includes("not paired") ||
          msg.includes("paired")
        ) {
          setPaired(false);
          setDesktopRunning(true);
        } else if (
          msg.includes("not running") ||
          msg.includes("lost") ||
          msg.includes("closed") ||
          msg.includes("Cannot connect")
        ) {
          setDesktopRunning(false);
          setError(msg);
        } else {
          setError(msg);
          setDesktopRunning(false);
        }
      } else {
        setDesktopRunning(true);
        setPaired(response.paired !== false);
        setLocked(response.locked !== false);
      }
    });
  };

  const getCredentials = async (currentDomain: string) => {
    if (!currentDomain) return;
    chrome.runtime.sendMessage(
      { type: "GET_CREDENTIALS", domain: currentDomain },
      (response) => {
        if (!response || response.status === "error") {
          setError(response?.message || "Failed to load credentials.");
        } else {
          setCredentials(response.data || []);
        }
      }
    );
  };

  useEffect(() => {
    // 1. Get current active tab's domain
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          setDomain(url.hostname);
        } catch {
          setDomain("");
        }
      }
    });

    // 2. Check lock status
    setTimeout(() => {
      checkStatus();
    }, 0);
  }, []);

  useEffect(() => {
    if (paired && !locked && domain) {
      setTimeout(() => {
        getCredentials(domain);
      }, 0);
    }
  }, [paired, locked, domain]);

  const handleConnect = async () => {
    setError("");
    if (!pairingInput.trim()) {
      setError("Please enter a pairing key.");
      return;
    }
    await chrome.storage.local.set({ pairing_token: pairingInput.trim() });
    setIsChecking(true);
    checkStatus();
  };

  const handleUnpair = async () => {
    if (
      window.confirm(
        "Are you sure you want to disconnect from this desktop vault?"
      )
    ) {
      await chrome.storage.local.remove("pairing_token");
      setCredentials([]);
      setPaired(false);
      setLocked(true);
    }
  };

  const handleAutofill = (cred: CredentialItem) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "AUTOFILL",
            username: cred.username || "",
            password: cred.password || "",
          },
          (res) => {
            if (chrome.runtime.lastError) {
              setError(
                `Error: ${chrome.runtime.lastError.message}. If you just reloaded the extension, please reload the page.`
              );
              return;
            }
            if (res && res.success) {
              window.close(); // Close extension popup on successful autofill
            } else {
              setError(
                "Could not autofill credentials. Make sure you are on a login page."
              );
            }
          }
        );
      }
    });
  };

  const filteredCredentials = credentials.filter((c) =>
    (c.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isChecking) {
    return (
      <div
        className={classes.container}
        style={{
          justifyContent: "center",
          alignItems: "center",
          minHeight: "420px",
        }}
      >
        <div className={classes.lockedIcon}>
          <IconLoader2 size={24} className={classes.spinner} />
        </div>
        <p
          style={{
            marginTop: "16px",
            color: "var(--color-neutral-medium)",
            fontSize: "14px",
          }}
        >
          Connecting to vault...
        </p>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      {/* Header */}
      <div className={classes.header}>
        <div className={classes.logoSection}>
          <IconLock size={18} className={classes.logoIcon} />
          <span className={classes.logoText}>Secure Vault Manager</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            className={classes.iconBtn}
            onClick={checkStatus}
            title="Refresh status"
          >
            <IconRefresh size={15} />
          </button>
          {paired && desktopRunning && (
            <button
              className={classes.iconBtn}
              onClick={handleUnpair}
              title="Disconnect vault"
              style={{ color: "var(--color-danger)" }}
            >
              <IconPlugConnectedX size={15} />
            </button>
          )}
        </div>
      </div>

      {error && desktopRunning && (
        <div className={classes.errorMessage}>{error}</div>
      )}

      {/* 0. Desktop Offline Mode */}
      {!desktopRunning && (
        <div className={classes.offlineView}>
          <div className={classes.offlineIcon}>
            <IconPlugConnectedX size={24} />
          </div>
          <h4 className={classes.offlineTitle}>Ứng dụng Desktop chưa chạy</h4>
          <p className={classes.offlineDesc}>
            Vui lòng khởi chạy ứng dụng desktop{" "}
            <strong>Secure Vault Manager</strong> trên máy tính của bạn để sử
            dụng extension này.
          </p>
          <button
            className={classes.primaryBtn}
            onClick={() => {
              setIsChecking(true);
              checkStatus();
            }}
            style={{ width: "100%", marginTop: "8px" }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 1. Setup Pairing Mode */}
      {desktopRunning && !paired && (
        <div className={classes.setupView}>
          <h4 className={classes.setupTitle}>Pair with Desktop App</h4>
          <p className={classes.setupDesc}>
            Open the Secure Vault Desktop App, go to Settings, copy the
            <strong> Pairing Key</strong>, and paste it below.
          </p>
          <div className={classes.inputGroup}>
            <label className={classes.inputLabel}>Pairing Key</label>
            <input
              type="text"
              className={classes.textInput}
              placeholder="Paste pairing key here"
              value={pairingInput}
              onChange={(e) => setPairingInput(e.target.value)}
            />
          </div>
          <button className={classes.primaryBtn} onClick={handleConnect}>
            Connect
          </button>
        </div>
      )}

      {/* 2. Locked Mode (Biometrics & Fallback Password UI) */}
      {desktopRunning && paired && locked && (
        <form onSubmit={handleUnlockSubmit} className={classes.unlockForm}>
          <div className={classes.lockedIcon}>
            <IconLock size={24} />
          </div>
          <h4 className={classes.lockedTitle}>Mở khóa để điền mật khẩu</h4>
          <p className={classes.lockedDesc}>
            Secure Vault Manager đang cố mở khóa extension trình duyệt.
          </p>

          <div className={classes.unlockInputContainer}>
            <input
              type="password"
              className={classes.textInput}
              placeholder="Nhập mật khẩu Master..."
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              disabled={unlockLoading}
              style={{ width: "100%", paddingRight: "40px" }}
              autoFocus
            />
            <button
              type="button"
              className={classes.biometricsBtn}
              title="Xác thực sinh trắc học"
              onClick={handleTriggerBiometrics}
              disabled={unlockLoading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a10 10 0 0 0-10 10c0 5.522 4.478 10 10 10s10-4.478 10-10A10 10 0 0 0 12 2z" />
                <path d="M12 6a6 6 0 0 0-6 6c0 2.2.8 4.2 2.1 5.7M12 18a6 6 0 0 0 6-6c0-2.2-.8-4.2-2.1-5.7" />
                <path d="M12 10a2 2 0 0 0-2 2c0 .8.8 2 2 2s2-1.2 2-2a2 2 0 0 0-2-2z" />
              </svg>
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              width: "100%",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              className={classes.secondaryBtn}
              onClick={handleCancelUnlock}
              disabled={unlockLoading}
              style={{ flex: 1 }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={classes.primaryBtn}
              disabled={unlockLoading || !unlockPassword}
              style={{ flex: 2 }}
            >
              {unlockLoading ? "Đang mở khóa..." : "Mở khóa"}
            </button>
          </div>
        </form>
      )}

      {/* 3. Credentials list Mode */}
      {desktopRunning && paired && !locked && (
        <>
          {domain && <div className={classes.domainBadge}>{domain}</div>}

          <input
            type="text"
            className={classes.textInput}
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              marginBottom: "12px",
              width: "100%",
            }}
          />

          <div className={classes.credentialsList}>
            {filteredCredentials.length > 0 ? (
              filteredCredentials.map((cred) => (
                <div key={cred.id} className={classes.credentialCard}>
                  <div className={classes.credentialInfo}>
                    <span className={classes.credentialTitle}>{domain}</span>
                    <span className={classes.credentialUsername}>
                      {cred.username || "No username"}
                    </span>
                  </div>
                  <button
                    className={classes.autofillBtn}
                    onClick={() => handleAutofill(cred)}
                  >
                    Autofill
                  </button>
                </div>
              ))
            ) : (
              <div className={classes.noAccounts}>
                No accounts found for this site.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
