import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { getWasmGreet } from "@secure-vault/shared";

function Popup() {
  const [msg, setMsg] = useState("Loading Wasm...");

  useEffect(() => {
    getWasmGreet("Browser Extension User")
      .then((greetMsg) => setMsg(greetMsg))
      .catch((err) => setMsg("Failed to load Wasm: " + err));
  }, []);

  return (
    <div style={{ width: "300px", padding: "10px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 10px 0" }}>Secure Vault Manager</h3>
      <p style={{ fontSize: "14px", color: "#555" }}>{msg}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
