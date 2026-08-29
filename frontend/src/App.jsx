import { useState, useEffect } from "react";
import "./App.css";

function App() {
  // Multi-Node State
  const [selectedNode, setSelectedNode] = useState("local");
  const [nodesCatalog, setNodesCatalog] = useState([
    { id: "local", name: "💻 Local Host Machine", provider: "Physical Host" },
    { id: "us-east-1", name: "🏢 US-East Primary App Cluster", provider: "AWS EC2" },
    { id: "eu-west-1", name: "🗄️ EU-West Database Core", provider: "AWS Aurora" },
    { id: "ap-southeast-1", name: "⚡ Asia-Pacific Edge CDN", provider: "Cloudflare Edge" },
    { id: "us-west-2", name: "🤖 US-West AI Model Cluster", provider: "NVIDIA H100" },
    { id: "aws-cloud", name: "☁️ AWS Infrastructure", provider: "AWS Global" },
    { id: "google-cloud", name: "🌐 Google Cloud Platform", provider: "GCP Cloud" },
    { id: "stripe-payments", name: "💳 Stripe Payment API", provider: "Stripe Inc." },
    { id: "openai-api", name: "🧠 OpenAI Model Engine", provider: "OpenAI Platform" }
  ]);

  // Core Telemetry Metrics State
  const [metrics, setMetrics] = useState({
    node_id: "local",
    node_info: { name: "💻 Local Host Machine", provider: "Physical Host" },
    cpu: 0,
    cpu_cores: [],
    cpu_count: 1,
    memory: 0,
    memory_used_gb: 0,
    memory_total_gb: 0,
    swap_percent: 0,
    disk: 0,
    disk_used_gb: 0,
    disk_total_gb: 0,
    network_rx_kbs: 0,
    network_tx_kbs: 0,
    rps: 0,
    p95_latency_ms: 12.4,
    error_rate_pct: 0.02,
    process_count: 0,
    uptime: "0m 0s",
    platform: "Linux",
    status: "ok",
    is_spiking: false,
    alert_reasons: [],
    top_processes: [],
    container_pods: []
  });

  // Historical Telemetry Data for SVG Charts
  const [history, setHistory] = useState([]);

  // Active Tab & Incident Management State
  const [activeTab, setActiveTab] = useState("analytics");
  const [incidents, setIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [connStatus, setConnStatus] = useState("connecting");
  const [latency, setLatency] = useState(0);
  const [toastMsg, setToastMsg] = useState("");

  // Alert Threshold Configuration State
  const [thresholds, setThresholds] = useState({
    cpu_warning: 75.0,
    cpu_critical: 90.0,
    memory_warning: 80.0,
    memory_critical: 95.0,
    disk_warning: 85.0,
    disk_critical: 95.0
  });
  const [thresholdMsg, setThresholdMsg] = useState("");

  // 1. Fetch Node Catalog & Initial Telemetry
  useEffect(() => {
    fetch("http://localhost:8000/api/nodes")
      .then((res) => res.json())
      .then((catalog) => setNodesCatalog(catalog))
      .catch((err) => console.log("Catalog fetch error:", err));

    fetch(`http://localhost:8000/api/nodes/${selectedNode}/metrics`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setHistory([{ cpu: data.cpu, memory: data.memory, rps: data.rps / 1000 }]);
      })
      .catch((err) => console.log("Initial snapshot fetch error:", err));

    fetch("http://localhost:8000/api/alerts/config")
      .then((res) => res.json())
      .then((data) => setThresholds(data))
      .catch((err) => console.log("Thresholds fetch error:", err));
  }, [selectedNode]);

  // Fetch Incidents from Database
  const fetchIncidents = () => {
    fetch("http://localhost:8000/api/incidents?resolved=false")
      .then((res) => res.json())
      .then((data) => setIncidents(data))
      .catch((err) => console.log("Fetch incidents error:", err));
  };

  // 2. Polling / Telemetry Loop for Selected Node & Incidents
  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(() => {
      const pingStart = Date.now();
      fetch(`http://localhost:8000/api/nodes/${selectedNode}/metrics`)
        .then((res) => res.json())
        .then((data) => {
          setLatency(Date.now() - pingStart);
          setMetrics(data);

          setHistory((prev) => [
            ...prev.slice(-24),
            { cpu: data.cpu, memory: data.memory, rps: data.rps / 1000 }
          ]);

          fetchIncidents();
        })
        .catch((err) => console.log("Telemetry fetch error:", err));
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedNode]);

  // Trigger Cyber Monday Traffic Spike
  const handleInjectSpike = () => {
    fetch("http://localhost:8000/api/simulate/spike", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setToastMsg("⚡ Traffic Load Spike Injected! High load active for 15s.");
        setTimeout(() => setToastMsg(""), 4000);
      })
      .catch((err) => setToastMsg("❌ Spike injection failed."));
  };

  // Handle Threshold Form Submit
  const handleSaveThresholds = (e) => {
    e.preventDefault();
    fetch("http://localhost:8000/api/alerts/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(thresholds)
    })
      .then((res) => res.json())
      .then((data) => {
        setThresholdMsg("✅ Threshold rules updated!");
        setTimeout(() => setThresholdMsg(""), 3000);
      })
      .catch((err) => setThresholdMsg("❌ Failed to update thresholds."));
  };

  // CSV Export
  const handleExportCSV = () => {
    window.open("http://localhost:8000/api/export", "_blank");
  };

  // Resolve Incident via Backend Database
  const resolveIncident = (id) => {
    fetch(`http://localhost:8000/api/incidents/${id}/resolve`, { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        setIncidents((prev) => prev.filter((item) => item.id !== id));
      })
      .catch((err) => console.log("Resolve incident error:", err));
  };

  // Resolve All Incidents via Backend Database
  const handleResolveAllIncidents = () => {
    fetch("http://localhost:8000/api/incidents/resolve-all", { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        setIncidents([]);
      })
      .catch((err) => console.log("Resolve all error:", err));
  };


  // SVG Chart Generators
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

  // Filtered Processes
  const filteredProcesses = (metrics.top_processes || []).filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pid.toString().includes(searchTerm) ||
      p.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">
      {/* Toast Overlay */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            background: "linear-gradient(135deg, #f43f5e, #f59e0b)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "12px",
            fontWeight: "700",
            boxShadow: "0 8px 24px rgba(244, 63, 94, 0.4)"
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Top Navbar */}
      <div className="navbar">
        <div className="brand">
          <span className="brand-logo">⚡</span>
          <div className="brand-text">
            <h1>Enterprise Cloud & Web Service Observability</h1>
            <p>Big Tech Multi-Region Infrastructure & Cloud Simulator</p>
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

          {/* Traffic Spike Button */}
          <button className="spike-btn" onClick={handleInjectSpike}>
            ⚡ Inject Traffic Load
          </button>

          <div className={`status-badge ${metrics.status}`}>
            <span className="pulse-dot"></span>
            {metrics.status.toUpperCase()}
          </div>

          <div className="btn-secondary" title="Network Ping Latency">
            📶 {latency}ms
          </div>

          <button className="btn-secondary" onClick={handleExportCSV}>
            📥 Export Log
          </button>
        </div>
      </div>

      {/* Hero Telemetry Bar */}
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
            <div className="value">{metrics.uptime}</div>
          </div>
        </div>

        <div className="info-pill">
          <span className="info-icon">💻</span>
          <div className="info-details">
            <div className="label">Platform / Arch</div>
            <div className="value">{metrics.platform} ({metrics.cpu_count} Cores)</div>
          </div>
        </div>

        <div className="info-pill">
          <span className="info-icon">🚨</span>
          <div className="info-details">
            <div className="label">Active Incidents</div>
            <div className="value">{incidents.length} Unresolved</div>
          </div>
        </div>
      </div>

      {/* Main 4-Column Core Metric Cards */}
      <div className="metrics-grid">
        {/* CPU Card */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">⚡ CPU Load</span>
            <span className="card-subtext">{metrics.cpu_count} Cores</span>
          </div>
          <div className="card-value cyan">{metrics.cpu}%</div>
          <div className="progress-track">
            <div className="progress-fill cyan" style={{ width: `${Math.min(metrics.cpu, 100)}%` }}></div>
          </div>
          <div className="card-subtext">
            <span>Core Usage:</span>
            <span>{metrics.cpu_cores ? metrics.cpu_cores.length : 0} Cores Active</span>
          </div>
          {metrics.cpu_cores && metrics.cpu_cores.length > 0 && (
            <div className="core-grid">
              {metrics.cpu_cores.slice(0, 8).map((c, i) => (
                <div key={i} className="core-bar" title={`Core ${i + 1}: ${c}%`}>
                  <div className="core-fill" style={{ width: `${c}%` }}></div>
                  <span className="core-num">C{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RAM Memory Card */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">💾 RAM Memory</span>
            <span className="card-subtext">{metrics.memory_used_gb} / {metrics.memory_total_gb} GB</span>
          </div>
          <div className="card-value indigo">{metrics.memory}%</div>
          <div className="progress-track">
            <div className="progress-fill indigo" style={{ width: `${Math.min(metrics.memory, 100)}%` }}></div>
          </div>
          <div className="card-subtext">
            <span>Swap Allocation:</span>
            <span>{metrics.swap_percent}% Used</span>
          </div>
        </div>

        {/* RPS & Throughput Card */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">🚀 Throughput (RPS)</span>
            <span className="card-subtext">Requests / Sec</span>
          </div>
          <div className="card-value emerald">{metrics.rps ? metrics.rps.toLocaleString() : 0}</div>
          <div className="progress-track">
            <div
              className="progress-fill emerald"
              style={{ width: `${Math.min(((metrics.rps || 0) / 100000) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="card-subtext">
            <span>p95 Latency: {metrics.p95_latency_ms}ms</span>
            <span>Error Rate: {metrics.error_rate_pct}%</span>
          </div>
        </div>

        {/* Network Throughput Card */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">🌐 Bandwidth I/O</span>
            <span className="card-subtext">Network Transfer Rate</span>
          </div>
          <div className="card-value amber">
            {metrics.network_rx_kbs ? metrics.network_rx_kbs.toLocaleString() : 0} <span style={{ fontSize: "1rem" }}>KB/s</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill amber"
              style={{ width: `${Math.min(((metrics.network_rx_kbs || 0) / 50000) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="card-subtext">
            <span>⬇ RX: {metrics.network_rx_kbs} KB/s</span>
            <span>⬆ TX: {metrics.network_tx_kbs} KB/s</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          📈 Live Analytics & Telemetry
        </button>

        <button
          className={`tab-btn ${activeTab === "global-services" ? "active" : ""}`}
          onClick={() => setActiveTab("global-services")}
        >
          🌐 Global Cloud & Web Services Status ({nodesCatalog.length})
        </button>

        <button
          className={`tab-btn ${activeTab === "pods" ? "active" : ""}`}
          onClick={() => setActiveTab("pods")}
        >
          🧊 Container Pod Matrix ({metrics.container_pods ? metrics.container_pods.length : 0})
        </button>

        <button
          className={`tab-btn ${activeTab === "processes" ? "active" : ""}`}
          onClick={() => setActiveTab("processes")}
        >
          ⚙️ Process Manager ({metrics.top_processes ? metrics.top_processes.length : 0})
        </button>

        <button
          className={`tab-btn ${activeTab === "incidents" ? "active" : ""}`}
          onClick={() => setActiveTab("incidents")}
        >
          🚨 Alert Center ({incidents.length})
        </button>
      </div>

      {/* Tab 1: Real-Time Telemetry Analytics */}
      {activeTab === "analytics" && (
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">
              <h3>Live Telemetry Trend (Node: {metrics.node_info ? metrics.node_info.name : selectedNode})</h3>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: "#06b6d4" }}></div> CPU Usage (%)
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: "#6366f1" }}></div> RAM Usage (%)
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: "#10b981" }}></div> RPS / 100
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

            {/* Horizontal Gridlines */}
            <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="500" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="110" x2="500" y2="110" stroke="#1e293b" strokeDasharray="3 3" />

            {/* Area Fills */}
            {history.length > 1 && (
              <>
                <path d={buildAreaPath("cpu")} fill="url(#cpuGrad)" />
                <path d={buildAreaPath("memory")} fill="url(#memGrad)" />
              </>
            )}

            {/* Lines */}
            {history.length > 1 && (
              <>
                <path d={buildSvgPath("cpu")} fill="none" stroke="#06b6d4" strokeWidth="2.5" />
                <path d={buildSvgPath("memory")} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                <path d={buildSvgPath("rps")} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
              </>
            )}
          </svg>
        </div>
      )}

      {/* Tab 2: Global Cloud & Services Status */}
      {activeTab === "global-services" && (
        <div className="global-services-grid">
          {nodesCatalog.map((node) => (
            <div key={node.id} className="service-card">
              <div className="service-card-header">
                <span className="service-name">{node.name}</span>
                <span className="proc-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                  {node.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                Provider: <strong>{node.provider}</strong> | Region: {node.region}
              </div>
              <button
                className="btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setSelectedNode(node.id);
                  setActiveTab("analytics");
                }}
              >
                🔍 Inspect Node Telemetry
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Container Pod Matrix */}
      {activeTab === "pods" && (
        <div className="pod-matrix-container">
          <div className="table-header">
            <h3>Microservice Kubernetes Container Pod Matrix ({metrics.container_pods ? metrics.container_pods.length : 0} Pods)</h3>
            <button className="spike-btn" onClick={handleInjectSpike}>
              ⚡ Trigger Pod Failover Test
            </button>
          </div>

          <div className="pod-matrix-grid">
            {(metrics.container_pods || []).map((pod) => (
              <div key={pod.id} className={`pod-box ${pod.status}`}>
                <div className="pod-name" title={pod.name}>
                  {pod.name}
                </div>
                <div className="pod-stats">CPU: {pod.cpu}%</div>
                <div className="pod-stats">RAM: {pod.memory}%</div>
                <div className="pod-stats">Restarts: {pod.restarts}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Top Running Process Manager */}
      {activeTab === "processes" && (
        <div className="process-table-container">
          <div className="table-header">
            <h3>Active System Processes ({selectedNode})</h3>
            <input
              type="text"
              placeholder="🔍 Search process name, PID, or user..."
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
                    No running processes match search query.
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
      )}

      {/* Tab 5: Alert Center & Threshold Settings */}
      {activeTab === "incidents" && (
        <div className="incident-container">
          <div className="incident-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>🚨 Incident Log ({incidents.length})</h3>
              {incidents.length > 0 && (
                <button
                  className="btn-secondary"
                  style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.4)" }}
                  onClick={handleResolveAllIncidents}
                >
                  ✓ Resolve All Incidents
                </button>
              )}
            </div>

            {incidents.length === 0 ? (
              <p style={{ color: "#94a3b8", marginTop: "1rem", fontStyle: "italic" }}>
                ✅ All system telemetry parameters operating normally.
              </p>
            ) : (
              <div className="incident-list">
                {incidents.map((item) => (
                  <div key={item.id} className={`incident-item ${item.status}`}>
                    <div>
                      <strong style={{ textTransform: "uppercase" }}>[{item.status}]</strong> {item.reason || item.reasons}
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                        Node: {item.node_name || item.node || "Local Host"} | Created: {new Date(item.created_at || Date.now()).toLocaleTimeString()} | CPU: {item.cpu_percent || item.cpu}%
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={() => resolveIncident(item.id)}>
                      ✓ Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="threshold-card">
            <h3>⚙️ Threshold Rules</h3>
            <form onSubmit={handleSaveThresholds} className="threshold-form">
              <div className="field-group">
                <label>CPU Warning Limit (%)</label>
                <input
                  type="number"
                  value={thresholds.cpu_warning}
                  onChange={(e) => setThresholds({ ...thresholds, cpu_warning: parseFloat(e.target.value) })}
                />
              </div>

              <div className="field-group">
                <label>CPU Critical Limit (%)</label>
                <input
                  type="number"
                  value={thresholds.cpu_critical}
                  onChange={(e) => setThresholds({ ...thresholds, cpu_critical: parseFloat(e.target.value) })}
                />
              </div>

              <div className="field-group">
                <label>Memory Warning Limit (%)</label>
                <input
                  type="number"
                  value={thresholds.memory_warning}
                  onChange={(e) => setThresholds({ ...thresholds, memory_warning: parseFloat(e.target.value) })}
                />
              </div>

              <div className="field-group">
                <label>Memory Critical Limit (%)</label>
                <input
                  type="number"
                  value={thresholds.memory_critical}
                  onChange={(e) => setThresholds({ ...thresholds, memory_critical: parseFloat(e.target.value) })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: "10px" }}>
                💾 Save Threshold Rules
              </button>

              {thresholdMsg && (
                <div style={{ fontSize: "0.8rem", color: "#34d399", textAlign: "center", marginTop: "6px" }}>
                  {thresholdMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


