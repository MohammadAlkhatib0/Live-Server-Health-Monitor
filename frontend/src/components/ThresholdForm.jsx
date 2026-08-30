import React from "react";

export function ThresholdForm({ thresholds, setThresholds, handleSaveThresholds, thresholdMsg }) {
  return (
    <div className="threshold-card" style={{ maxWidth: "500px" }}>
      <h3>⚙️ Configure Alert Thresholds</h3>
      <form onSubmit={handleSaveThresholds} className="threshold-form">
        <div className="field-group">
          <label>CPU Warning Threshold (%) [Step 7 Default: 80%]</label>
          <input
            type="number"
            value={thresholds.cpu_warning}
            onChange={(e) => setThresholds({ ...thresholds, cpu_warning: parseFloat(e.target.value) })}
          />
        </div>

        <div className="field-group">
          <label>CPU Critical Threshold (%)</label>
          <input
            type="number"
            value={thresholds.cpu_critical}
            onChange={(e) => setThresholds({ ...thresholds, cpu_critical: parseFloat(e.target.value) })}
          />
        </div>

        <div className="field-group">
          <label>RAM Memory Warning Threshold (%) [Tier 1 Goal]</label>
          <input
            type="number"
            value={thresholds.memory_warning}
            onChange={(e) => setThresholds({ ...thresholds, memory_warning: parseFloat(e.target.value) })}
          />
        </div>

        <div className="field-group">
          <label>RAM Memory Critical Threshold (%)</label>
          <input
            type="number"
            value={thresholds.memory_critical}
            onChange={(e) => setThresholds({ ...thresholds, memory_critical: parseFloat(e.target.value) })}
          />
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: "10px" }}>
          💾 Save Alert Rules
        </button>

        {thresholdMsg && (
          <div style={{ fontSize: "0.8rem", color: "#34d399", textAlign: "center", marginTop: "6px" }}>
            {thresholdMsg}
          </div>
        )}
      </form>
    </div>
  );
}

export default ThresholdForm;
