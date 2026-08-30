import React from "react";

export function RecentHistoryTable({ recentReadings, thresholds, fetchRecentReadings }) {
  return (
    <div className="process-table-container">
      <div className="table-header">
        <h3>🗄️ Last 10 Database Readings (GET /api/readings/recent)</h3>
        <button className="btn-secondary" onClick={fetchRecentReadings}>
          🔄 Refresh List
        </button>
      </div>

      <table className="process-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Target Node</th>
            <th>CPU Usage (%)</th>
            <th>RAM Usage (%)</th>
            <th>Temperature (°C)</th>
            <th>Status</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {recentReadings.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                No readings recorded in database yet.
              </td>
            </tr>
          ) : (
            recentReadings.map((row) => (
              <tr key={row.id}>
                <td><code>#{row.id}</code></td>
                <td>{row.node_id || "local"}</td>
                <td
                  style={{
                    fontWeight: "700",
                    color: row.value > (thresholds.cpu_warning || 80) ? "#f43f5e" : "#06b6d4"
                  }}
                >
                  {row.value}%
                </td>
                <td style={{ fontWeight: "700", color: "#6366f1" }}>
                  {row.memory_value || 0}%
                </td>
                <td>{row.temperature || 45}°C</td>
                <td>
                  <span
                    className="proc-badge"
                    style={{
                      background:
                        row.status === "critical"
                          ? "rgba(244,63,94,0.2)"
                          : row.status === "warning"
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(16,185,129,0.15)",
                      color:
                        row.status === "critical"
                          ? "#f87171"
                          : row.status === "warning"
                          ? "#fbbf24"
                          : "#34d399"
                    }}
                  >
                    {row.status.toUpperCase()}
                  </span>
                </td>
                <td>{new Date(row.created_at || Date.now()).toLocaleTimeString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RecentHistoryTable;
