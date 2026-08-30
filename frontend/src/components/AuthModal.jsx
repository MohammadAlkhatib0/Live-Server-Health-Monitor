import React from "react";

export function AuthModal({
  isAuthenticated,
  usernameInput,
  setUsernameInput,
  passwordInput,
  setPasswordInput,
  authError,
  handleLoginSubmit
}) {
  if (isAuthenticated) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(11, 15, 25, 0.92)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div className="threshold-card" style={{ width: "360px", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>
          🔒 Dashboard Authentication Required
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>
          Tier 3 Security: Log in with system administrator credentials.
        </p>
        <form onSubmit={handleLoginSubmit} className="threshold-form">
          <div className="field-group">
            <label>Username</label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label>Password</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
          </div>
          {authError && <div style={{ color: "#f43f5e", fontSize: "0.8rem", marginTop: "4px" }}>{authError}</div>}
          <button type="submit" className="btn-primary" style={{ marginTop: "12px", justifyContent: "center" }}>
            🔓 Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
