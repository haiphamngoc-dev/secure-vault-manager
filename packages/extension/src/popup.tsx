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
          {paired && (
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

      {error && <div className={classes.errorMessage}>{error}</div>}

      {/* 1. Setup Pairing Mode */}
      {!paired && (
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

      {/* 2. Locked Mode */}
      {paired && locked && (
        <div className={classes.lockedView}>
          <div className={classes.lockedIcon}>
            <IconLock size={24} />
          </div>
          <h4 className={classes.lockedTitle}>Vault is Locked</h4>
          <p className={classes.lockedDesc}>
            Please unlock your vault database in the Secure Vault Desktop
            Application to view credentials.
          </p>
          <button
            className={classes.primaryBtn}
            onClick={checkStatus}
            style={{ width: "100%", marginTop: "8px" }}
          >
            Check Status
          </button>
        </div>
      )}

      {/* 3. Credentials list Mode */}
      {paired && !locked && (
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
