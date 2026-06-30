import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./popup.css";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [pairingInput, setPairingInput] = useState("");
  const [error, setError] = useState("");

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
        } else {
          setError(msg);
        }
      } else {
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
        className="container"
        style={{
          justifyContent: "center",
          alignItems: "center",
          minHeight: "380px",
        }}
      >
        <div
          className="locked-icon"
          style={{ animation: "spin 2s linear infinite" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </div>
        <p
          style={{
            marginTop: "16px",
            color: "var(--text-secondary)",
            fontSize: "14px",
          }}
        >
          Connecting to vault...
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="logo-section">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#logo-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient
                id="logo-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="logo-text">Secure Vault</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="icon-btn"
            onClick={checkStatus}
            title="Refresh status"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
          {paired && (
            <button
              className="icon-btn"
              onClick={handleUnpair}
              title="Disconnect vault"
              style={{ color: "var(--danger-color)" }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 1. Setup Pairing Mode */}
      {!paired && (
        <div className="setup-view">
          <h4 className="setup-title">Pair with Desktop App</h4>
          <p className="setup-desc">
            Open the Secure Vault Desktop App, go to Settings, copy the
            **Pairing Key**, and paste it below.
          </p>
          <div className="input-group">
            <label className="input-label">Pairing Key</label>
            <input
              type="text"
              className="text-input"
              placeholder="Paste pairing key here"
              value={pairingInput}
              onChange={(e) => setPairingInput(e.target.value)}
            />
          </div>
          <button className="primary-btn" onClick={handleConnect}>
            Connect
          </button>
        </div>
      )}

      {/* 2. Locked Mode */}
      {paired && locked && (
        <div className="locked-view">
          <div className="locked-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h4 className="locked-title">Vault is Locked</h4>
          <p className="locked-desc">
            Please unlock your vault database in the Secure Vault Desktop
            Application to view credentials.
          </p>
          <button
            className="primary-btn"
            onClick={checkStatus}
            style={{ width: "100%", marginTop: "10px" }}
          >
            Check Status
          </button>
        </div>
      )}

      {/* 3. Credentials list Mode */}
      {paired && !locked && (
        <>
          {domain && <div className="domain-badge">{domain}</div>}

          <input
            type="text"
            className="text-input"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              marginBottom: "12px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          <div className="credentials-list">
            {filteredCredentials.length > 0 ? (
              filteredCredentials.map((cred) => (
                <div key={cred.id} className="credential-card">
                  <div className="credential-info">
                    <span className="credential-title">{domain}</span>
                    <span className="credential-username">
                      {cred.username || "No username"}
                    </span>
                  </div>
                  <button
                    className="autofill-btn"
                    onClick={() => handleAutofill(cred)}
                  >
                    Autofill
                  </button>
                </div>
              ))
            ) : (
              <div className="no-accounts">
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
