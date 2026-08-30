import React from "react";

export function NavTabs({ activeTab, setActiveTab, liveWarningsCount }) {
  return (
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
        🚨 Live Warnings Log ({liveWarningsCount}) (Step 11)
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
  );
}

export default NavTabs;
