import { useState, useEffect, useRef } from "react";
import "./App.css";

// Import Modular Components
import AuthModal from "./components/AuthModal";
import Navbar from "./components/Navbar";
import SystemInfoBar from "./components/SystemInfoBar";
import MetricsGrid from "./components/MetricsGrid";
import NavTabs from "./components/NavTabs";
import AnalyticsChart from "./components/AnalyticsChart";
import RecentHistoryTable from "./components/RecentHistoryTable";
import WarningsFeed from "./components/WarningsFeed";
import ProcessManager from "./components/ProcessManager";
import ThresholdForm from "./components/ThresholdForm";

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

          // Refresh DB readings periodically
          fetchRecentReadings();
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

      {/* Tier 3 Auth Modal Component */}
      <AuthModal
        isAuthenticated={isAuthenticated}
        usernameInput={usernameInput}
        setUsernameInput={setUsernameInput}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        authError={authError}
        handleLoginSubmit={handleLoginSubmit}
      />

      {/* Top Navbar Component */}
      <Navbar
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        nodesCatalog={nodesCatalog}
        connStatus={connStatus}
        status={metrics.status}
        handleInjectSpike={handleInjectSpike}
        handleHandleLoad={handleHandleLoad}
        handleExportCSV={handleExportCSV}
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />

      {/* Hero Telemetry System Info Bar Component */}
      <SystemInfoBar
        metrics={metrics}
        selectedNode={selectedNode}
        liveWarningsCount={liveWarnings.length}
      />

      {/* Main Metric Cards Grid Component */}
      <MetricsGrid metrics={metrics} thresholds={thresholds} />

      {/* Tab Navigation Component */}
      <NavTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        liveWarningsCount={liveWarnings.length}
      />

      {/* Tab Content Components */}
      {activeTab === "analytics" && (
        <AnalyticsChart
          history={history}
          nodeName={metrics.node_info ? metrics.node_info.name : selectedNode}
        />
      )}

      {activeTab === "recent-history" && (
        <RecentHistoryTable
          recentReadings={recentReadings}
          thresholds={thresholds}
          fetchRecentReadings={fetchRecentReadings}
        />
      )}

      {activeTab === "warnings-feed" && (
        <WarningsFeed
          liveWarnings={liveWarnings}
          setLiveWarnings={setLiveWarnings}
          resolveLiveWarning={resolveLiveWarning}
        />
      )}

      {activeTab === "processes" && (
        <ProcessManager
          selectedNode={selectedNode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredProcesses={filteredProcesses}
        />
      )}

      {activeTab === "thresholds" && (
        <ThresholdForm
          thresholds={thresholds}
          setThresholds={setThresholds}
          handleSaveThresholds={handleSaveThresholds}
          thresholdMsg={thresholdMsg}
        />
      )}
    </div>
  );
}

export default App;
