import React from "react";

export function Navbar({
  selectedNode,
  setSelectedNode,
  nodesCatalog,
  connStatus,
  status,
  handleInjectSpike,
  handleHandleLoad,
  handleExportCSV,
  isAuthenticated,
  setIsAuthenticated
}) {
  return (
    <div className="navbar">
      <div className="brand">
        <span className="brand-logo">⚡</span>
        <div className="brand-text">
          <h1>Live Server Health Monitor</h1>
          <p>FastAPI + WebSocket + PostgreSQL Telemetry Dashboard</p>
        </div>
      </div>

      <div className="nav-controls">
        {/* Node Selector Dropdown */}
        <select
          className="node-select-dropdown"
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
        >
          {nodesCatalog.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name} ({node.provider})
            </option>
          ))}
        </select>

        {/* Step 9 WebSocket Connection Status Indicator */}
        <div className="btn-secondary" title="WebSocket Status">
          {connStatus === "connected" ? "🟢 WS Live" : "🔴 WS Reconnecting"}
        </div>

        {/* Step 10 Color-Coded Status Badge */}
        <div className={`status-badge ${status}`}>
          <span className="pulse-dot"></span>
          {status ? status.toUpperCase() : "OK"}
        </div>

        {/* Traffic Spike Button */}
        <button className="spike-btn" onClick={handleInjectSpike}>
          ⚡ Inject Load
        </button>

        {/* Handle Load Action Button */}
        <button className="handle-load-btn" onClick={handleHandleLoad}>
          🛡️ Shed Load
        </button>

        <button className="btn-secondary" onClick={handleExportCSV}>
          📥 Export CSV
        </button>

        {/* Auth Lock Toggle (Tier 3) */}
        <button className="btn-secondary" onClick={() => setIsAuthenticated(!isAuthenticated)}>
          {isAuthenticated ? "🔒 Lock" : "🔓 Unlock"}
        </button>
      </div>
    </div>
  );
}

export default Navbar;
