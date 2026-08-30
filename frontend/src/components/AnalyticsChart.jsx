import React from "react";

export function AnalyticsChart({ history, nodeName }) {
  // SVG Chart Path Generators (Tier 2 Goal: last 20 readings line chart)
  const buildSvgPath = (key) => {
    if (history.length < 2) return "";
    return history
      .map((item, idx) => {
        const x = (idx / Math.max(history.length - 1, 1)) * 500;
        const val = item[key] || 0;
        const y = 140 - (val / 100) * 120;
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const buildAreaPath = (key) => {
    if (history.length < 2) return "";
    const linePath = buildSvgPath(key);
    const lastX = 500;
    return `${linePath} L ${lastX} 140 L 0 140 Z`;
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <h3>Live Line Chart (Last 20 Readings) — Node: {nodeName}</h3>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#06b6d4" }}></div> CPU Usage (%)
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#6366f1" }}></div> Memory Usage (%)
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#f97316" }}></div> Temp (°C)
          </div>
        </div>
      </div>

      <svg viewBox="0 0 500 140" className="svg-chart">
        <defs>
          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
        <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
        <line x1="0" y1="80" x2="500" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
        <line x1="0" y1="110" x2="500" y2="110" stroke="#1e293b" strokeDasharray="3 3" />

        {/* Line Areas */}
        {history.length > 1 && (
          <>
            <path d={buildAreaPath("cpu")} fill="url(#cpuGrad)" />
            <path d={buildAreaPath("memory")} fill="url(#memGrad)" />
          </>
        )}

        {/* SVG Trend Lines */}
        {history.length > 1 && (
          <>
            <path d={buildSvgPath("cpu")} fill="none" stroke="#06b6d4" strokeWidth="2.5" />
            <path d={buildSvgPath("memory")} fill="none" stroke="#6366f1" strokeWidth="2.5" />
            <path d={buildSvgPath("temp")} fill="none" stroke="#f97316" strokeWidth="2.5" />
          </>
        )}
      </svg>
    </div>
  );
}

export default AnalyticsChart;
