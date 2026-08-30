import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  // Authentication State (Tier 3 Stretch Goal)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("admin123");
  const [authError, setAuthError] = useState("");

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
    temperature: 45.0,
    load_1m: 0.0,
    load_5m: 0.0,
    load_15m: 0.0,
    load_per_core: 0.0,
    load_status: "optimal",
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

  // Historical Telemetry Data for SVG Charts (Tier 2: last 20 readings)
  const [history, setHistory] = useState([]);

  // Database Recent Readings (Step 8 & Step 10: last 10 readings on page load)
  const [recentReadings, setRecentReadings] = useState([]);

  // Live Warning Log (Step 11: running list of recent warnings live)
  const [liveWarnings, setLiveWarnings] = useState([]);

  // Active Tab & Incident Management State
  const [activeTab, setActiveTab] = useState("analytics");
  const [incidents, setIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [connStatus, setConnStatus] = useState("connecting");
  const [toastMsg, setToastMsg] = useState("");

  // Alert Threshold Configuration State
  const [thresholds, setThresholds] = useState({
    cpu_warning: 80.0,
    cpu_critical: 90.0,
    memory_warning: 80.0,
    memory_critical: 95.0,
    disk_warning: 85.0,
    disk_critical: 95.0,
    temp_warning: 75.0,
    temp_critical: 85.0
  });
  const [thresholdMsg, setThresholdMsg] = useState("");

  const wsRef = useRef(null);

  // Fetch Recent Readings from DB (Step 8 & Step 10)
  const fetchRecentReadings = () => {
    fetch("http://localhost:8000/api/readings/recent?limit=10")
      .then((res) => res.json())
      .then((data) => setRecentReadings(data))
      .catch((err) => console.log("Recent readings fetch error:", err));
  };

  // Fetch Incidents from Database
  const fetchIncidents = () => {
    fetch("http://localhost:8000/api/incidents?resolved=false")
      .then((res) => res.json())
      .then((data) => setIncidents(data))
      .catch((err) => console.log("Fetch incidents error:", err));
  };

  // 1. Initial Load: Catalog, Thresholds, & Recent History from DB
  useEffect(() => {
    fetch("http://localhost:8000/api/nodes")
      .then((res) => res.json())
      .then((catalog) => setNodesCatalog(catalog))
      .catch((err) => console.log("Catalog fetch error:", err));

    fetch("http://localhost:8000/api/alerts/config")
      .then((res) => res.json())
      .then((data) => setThresholds(data))
      .catch((err) => console.log("Thresholds fetch error:", err));

    fetchRecentReadings();
    fetchIncidents();
  }, []);

  // 2. Step 9: Establish WebSocket Connection to /ws/metrics on Page Load
  useEffect(() => {
    let isSubscribed = true;
    let ws;

    const connectWebSocket = () => {
      setConnStatus("connecting");
      const host = window.location.hostname || "localhost";
      const wsUrl = `ws://${host}:8000/ws/metrics`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSubscribed) return;
        setConnStatus("connected");
        console.log("⚡ WebSocket connected to /ws/metrics");
        ws.send(selectedNode);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(event.data);
          setMetrics(data);

          // Update SVG History (Tier 2: max 20 readings)
          setHistory((prev) => [
            ...prev.slice(-19),
            { cpu: data.cpu, memory: data.memory, rps: data.rps / 1000, temp: data.temperature || 45 }
          ]);

          // Step 11: Live Warning List Prepend
          if (data.status === "warning" || data.status === "critical") {
            const newWarning = {
              id: Date.now() + Math.random(),
              node_name: data.node_info ? data.node_info.name : selectedNode,
              value: data.cpu,
              memory: data.memory,
              status: data.status,
              reasons: data.alert_reasons && data.alert_reasons.length > 0 ? data.alert_reasons.join(", ") : `High CPU ${data.cpu}%`,
              created_at: new Date().toLocaleTimeString()
            };

            setLiveWarnings((prev) => [newWarning, ...prev.slice(0, 19)]);
          }

          // Refresh DB readings & incidents periodically
          fetchRecentReadings();
          fetchIncidents();
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket error:", err);
        setConnStatus("disconnected");
      };

      ws.onclose = () => {
        if (!isSubscribed) return;
        setConnStatus("disconnected");
        console.log("WebSocket disconnected, reconnecting in 3s...");
        setTimeout(() => {
          if (isSubscribed) connectWebSocket();
        }, 3000);
      };
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
    };
  }, []);

  // Update active node via WebSocket when selectedNode changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(selectedNode);
    }
  }, [selectedNode]);

  // Auth Handler (Tier 3)
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setAuthError("");
    fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsAuthenticated(true);
          setToastMsg("🔓 Authenticated successfully as Admin!");
          setTimeout(() => setToastMsg(""), 3000);
        } else {
          setAuthError(data.error || "Authentication failed.");
        }
      })
      .catch(() => setAuthError("Server login error connection failed."));
  };

  // Trigger Cyber Monday Traffic Spike
  const handleInjectSpike = () => {
    fetch("http://localhost:8000/api/simulate/spike", { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        setToastMsg("⚡ Traffic Load Spike Injected! High load active for 15s.");
        setTimeout(() => setToastMsg(""), 4000);
      })
      .catch(() => setToastMsg("❌ Spike injection failed."));
  };

  // Handle / Shed Server Load
  const handleHandleLoad = () => {
    fetch("http://localhost:8000/api/simulate/handle-load", { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        setToastMsg("🛡️ Server load shed & thermal performance stabilized!");
        setTimeout(() => setToastMsg(""), 4000);
      })
      .catch(() => setToastMsg("❌ Load handling failed."));
  };

  // Resolve Live Warning (Tier 1 Goal)
  const resolveLiveWarning = (id) => {
    setLiveWarnings((prev) => prev.filter((item) => item.id !== id));
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
      .then(() => {
        setThresholdMsg("✅ Threshold rules updated!");
        setTimeout(() => setThresholdMsg(""), 3000);
      })
      .catch(() => setThresholdMsg("❌ Failed to update thresholds."));
  };

  // CSV Export
  const handleExportCSV = () => {
    window.open("http://localhost:8000/api/export", "_blank");
  };

  // SVG Chart Generators (Tier 2 Goal: last 20 readings line chart)
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

      {/* Tier 3 Auth Modal Guard */}
      {!isAuthenticated && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(11, 15, 25, 0.92)", backdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
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
                <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} required />
              </div>
              <div className="field-group">
                <label>Password</label>
                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required />
              </div>
              {authError && <div style={{ color: "#f43f5e", fontSize: "0.8rem", marginTop: "4px" }}>{authError}</div>}
              <button type="submit" className="btn-primary" style={{ marginTop: "12px", justifyContent: "center" }}>
                🔓 Access Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Top Navbar */}
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
          <div className={`status-badge ${metrics.status}`}>
            <span className="pulse-dot"></span>
            {metrics.status.toUpperCase()}
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
            <div className="label">Platform / Cores</div>
            <div className="value">{metrics.platform} ({metrics.cpu_count} Cores)</div>
          </div>
        </div>

        <div className="info-pill">
          <span className="info-icon">🚨</span>
          <div className="info-details">
            <div className="label">Active Warnings</div>
            <div className="value">{liveWarnings.length} Live Logged</div>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid (Step 9 & Tier 1) */}
      <div className="metrics-grid">
        {/* CPU Usage Card (Step 9: Updating Live) */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">⚡ Real CPU Usage</span>
            <span className="card-subtext">{metrics.cpu_count} Cores</span>
          </div>
          <div className={`card-value ${metrics.cpu > (thresholds.cpu_warning || 80) ? "rose" : "cyan"}`}>
            {metrics.cpu}%
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${metrics.cpu > (thresholds.cpu_warning || 80) ? "rose" : "cyan"}`}
              style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
            ></div>
          </div>
          <div className="card-subtext">
            <span>Threshold: {thresholds.cpu_warning || 80}% Warn</span>
            <span>{metrics.cpu > (thresholds.cpu_warning || 80) ? "⚠️ High CPU" : "✅ Normal"}</span>
          </div>
        </div>

        {/* RAM Memory Card (Tier 1 Goal: Second Real Metric) */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">💾 RAM Memory Usage</span>
            <span className="card-subtext">{metrics.memory_used_gb} / {metrics.memory_total_gb} GB</span>
          </div>
          <div className={`card-value ${metrics.memory > (thresholds.memory_warning || 80) ? "amber" : "indigo"}`}>
            {metrics.memory}%
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${metrics.memory > (thresholds.memory_warning || 80) ? "amber" : "indigo"}`}
              style={{ width: `${Math.min(metrics.memory, 100)}%` }}
            ></div>
          </div>
          <div className="card-subtext">
            <span>Threshold: {thresholds.memory_warning || 80}% Warn</span>
            <span>Swap: {metrics.swap_percent}%</span>
          </div>
        </div>

        {/* CPU Temperature Card */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">🌡️ CPU Temperature</span>
            <span className="card-subtext">Hardware Sensor</span>
          </div>
          <div className={`card-value ${metrics.temperature > 85 ? "rose" : (metrics.temperature > 75 ? "amber" : "cyan")}`}>
            {metrics.temperature}°C
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${metrics.temperature > 85 ? "rose" : (metrics.temperature > 75 ? "amber" : "cyan")}`}
              style={{ width: `${Math.min((metrics.temperature / 100) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="card-subtext">
            <span>System Temp</span>
            <span>{metrics.temperature > 75 ? "🔥 Elevated" : "❄️ Optimal"}</span>
          </div>
        </div>

        {/* System Load Average Card */}
        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">⚖️ System Load</span>
            <span className="card-subtext">1m / 5m / 15m</span>
          </div>
          <div className={`card-value ${metrics.load_per_core > 1.2 ? "rose" : "emerald"}`}>
            {metrics.load_1m} <span style={{ fontSize: "0.85rem" }}>1m</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${metrics.load_per_core > 1.2 ? "rose" : "emerald"}`}
              style={{ width: `${Math.min(((metrics.load_per_core || 0) / 2) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="card-subtext">
            <span>5m: {metrics.load_5m} | 15m: {metrics.load_15m}</span>
            <span>{metrics.load_per_core}/core</span>
          </div>
        </div>

        {/* RPS & Latency Card */}
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
            <span>p95: {metrics.p95_latency_ms}ms</span>
            <span>Errors: {metrics.error_rate_pct}%</span>
          </div>
        </div>

        {/* Network Transfer Card */}
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

      {/* Navigation Tabs */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          📈 Live Analytics & SVG Line Chart (Tier 2)
        </button>

        <button
          className={`tab-btn ${activeTab === "recent-history" ? "active" : ""}`}
          onClick={() => setActiveTab("recent-history")}
        >
          🗄️ Recent History (Step 8 & 10)
        </button>

        <button
          className={`tab-btn ${activeTab === "warnings-feed" ? "active" : ""}`}
          onClick={() => setActiveTab("warnings-feed")}
        >
          🚨 Live Warnings Log ({liveWarnings.length}) (Step 11)
        </button>

        <button
          className={`tab-btn ${activeTab === "processes" ? "active" : ""}`}
          onClick={() => setActiveTab("processes")}
        >
          ⚙️ Process Manager
        </button>

        <button
          className={`tab-btn ${activeTab === "thresholds" ? "active" : ""}`}
          onClick={() => setActiveTab("thresholds")}
        >
          ⚙️ Threshold Rules
        </button>
      </div>

      {/* Tab 1: Live Analytics & SVG Line Chart (Tier 2 Goal: Last 20 Readings Chart) */}
      {activeTab === "analytics" && (
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">
              <h3>Live Line Chart (Last 20 Readings) — Node: {metrics.node_info ? metrics.node_info.name : selectedNode}</h3>
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
      )}

      {/* Tab 2: Step 8 & Step 10 — Recent History from Database (Last 10 Readings) */}
      {activeTab === "recent-history" && (
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
                    <td style={{ fontWeight: "700", color: row.value > (thresholds.cpu_warning || 80) ? "#f43f5e" : "#06b6d4" }}>
                      {row.value}%
                    </td>
                    <td style={{ fontWeight: "700", color: "#6366f1" }}>
                      {row.memory_value || 0}%
                    </td>
                    <td>{row.temperature || 45}°C</td>
                    <td>
                      <span className={`proc-badge`} style={{
                        background: row.status === "critical" ? "rgba(244,63,94,0.2)" : (row.status === "warning" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.15)"),
                        color: row.status === "critical" ? "#f87171" : (row.status === "warning" ? "#fbbf24" : "#34d399")
                      }}>
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
      )}

      {/* Tab 3: Step 11 & Tier 1 — Live Warnings Feed (Prepend Live & Resolve Button) */}
      {activeTab === "warnings-feed" && (
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
      )}

      {/* Tab 4: Process Manager */}
      {activeTab === "processes" && (
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
      )}

      {/* Tab 5: Threshold Config Rules */}
      {activeTab === "thresholds" && (
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
      )}
    </div>
  );
}

export default App;
