import React from "react";

export function ProcessManager({ selectedNode, searchTerm, setSearchTerm, filteredProcesses }) {
  return (
    <div className="process-table-container">
      <div className="table-header">
        <h3>Active System Processes ({selectedNode})</h3>
        <input
          type="text"
          placeholder="🔍 Search process name or PID..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="process-table">
        <thead>
          <tr>
            <th>PID</th>
            <th>Process Name</th>
            <th>User</th>
            <th>CPU %</th>
            <th>Memory %</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredProcesses.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                No matching processes found.
              </td>
            </tr>
          ) : (
            filteredProcesses.map((proc, i) => (
              <tr key={i}>
                <td><code>{proc.pid}</code></td>
                <td className="proc-name">{proc.name}</td>
                <td>{proc.user}</td>
                <td style={{ color: proc.cpu_percent > 20 ? "#f43f5e" : "#06b6d4", fontWeight: "bold" }}>
                  {proc.cpu_percent}%
                </td>
                <td style={{ color: proc.memory_percent > 10 ? "#a855f7" : "#6366f1", fontWeight: "bold" }}>
                  {proc.memory_percent}%
                </td>
                <td><span className="proc-badge">{proc.status}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProcessManager;
