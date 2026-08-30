import React from "react";

export function SystemInfoBar({ metrics, selectedNode, liveWarningsCount }) {
  return (
    <div className="system-info-bar">
      <div className="info-pill">
        <span className="info-icon">📍</span>
        <div className="info-details">
          <div className="label">Active Target Node</div>
          <div className="value">{metrics.node_info ? metrics.node_info.name : selectedNode}</div>
        </div>
      </div>

      <div className="info-pill">
        <span className="info-icon">⏱️</span>
        <div className="info-details">
          <div className="label">System Uptime</div>
          <div className="value">{metrics.uptime || "0m 0s"}</div>
        </div>
      </div>

      <div className="info-pill">
        <span className="info-icon">💻</span>
        <div className="info-details">
          <div className="label">Platform / Cores</div>
          <div className="value">{metrics.platform || "Linux"} ({metrics.cpu_count || 1} Cores)</div>
        </div>
      </div>

      <div className="info-pill">
        <span className="info-icon">🚨</span>
        <div className="info-details">
          <div className="label">Active Warnings</div>
          <div className="value">{liveWarningsCount} Live Logged</div>
        </div>
      </div>
    </div>
  );
}

export default SystemInfoBar;
