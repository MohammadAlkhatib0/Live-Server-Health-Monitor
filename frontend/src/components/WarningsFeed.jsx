import React from "react";

export function WarningsFeed({ liveWarnings, setLiveWarnings, resolveLiveWarning }) {
  return (
    <div className="incident-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3>🚨 Live Warnings Feed (Prepend Live on High CPU/Mem Spike)</h3>
        {liveWarnings.length > 0 && (
          <button className="btn-secondary" onClick={() => setLiveWarnings([])}>
            Clear Warnings List
          </button>
        )}
      </div>

      {liveWarnings.length === 0 ? (
        <p style={{ color: "#94a3b8", marginTop: "1rem", fontStyle: "italic" }}>
          ✅ No high CPU/memory warnings currently logged. Everything operating normally!
        </p>
      ) : (
        <div className="incident-list">
          {liveWarnings.map((item) => (
            <div key={item.id} className={`incident-item ${item.status}`}>
              <div>
                <strong style={{ textTransform: "uppercase" }}>[{item.status}]</strong> {item.reasons}
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                  Node: {item.node_name} | CPU: {item.value}% | RAM: {item.memory}% | Logged: {item.created_at}
                </div>
              </div>
              {/* Tier 1 Goal: Resolve Button */}
              <button className="btn-secondary" onClick={() => resolveLiveWarning(item.id)}>
                ✓ Resolve Warning
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WarningsFeed;
