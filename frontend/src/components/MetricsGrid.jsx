import React from "react";
import MetricCard from "./MetricCard";

export function MetricsGrid({ metrics, thresholds }) {
  const cpuWarn = thresholds.cpu_warning || 80;
  const memWarn = thresholds.memory_warning || 80;

  return (
    <div className="metrics-grid">
      {/* CPU Usage Card (Step 9: Updating Live) */}
      <MetricCard
        title="⚡ Real CPU Usage"
        subHeader={`${metrics.cpu_count || 1} Cores`}
        value={metrics.cpu || 0}
        unit="%"
        colorClass={metrics.cpu > cpuWarn ? "rose" : "cyan"}
        progressPercent={metrics.cpu || 0}
        footerLeft={`Threshold: ${cpuWarn}% Warn`}
        footerRight={metrics.cpu > cpuWarn ? "⚠️ High CPU" : "✅ Normal"}
      />

      {/* RAM Memory Card (Tier 1 Goal: Second Real Metric) */}
      <MetricCard
        title="💾 RAM Memory Usage"
        subHeader={`${metrics.memory_used_gb || 0} / ${metrics.memory_total_gb || 0} GB`}
        value={metrics.memory || 0}
        unit="%"
        colorClass={metrics.memory > memWarn ? "amber" : "indigo"}
        progressPercent={metrics.memory || 0}
        footerLeft={`Threshold: ${memWarn}% Warn`}
        footerRight={`Swap: ${metrics.swap_percent || 0}%`}
      />

      {/* CPU Temperature Card */}
      <MetricCard
        title="🌡️ CPU Temperature"
        subHeader="Hardware Sensor"
        value={metrics.temperature || 45}
        unit="°C"
        colorClass={metrics.temperature > 85 ? "rose" : metrics.temperature > 75 ? "amber" : "cyan"}
        progressPercent={((metrics.temperature || 45) / 100) * 100}
        footerLeft="System Temp"
        footerRight={metrics.temperature > 75 ? "🔥 Elevated" : "❄️ Optimal"}
      />

      {/* System Load Average Card */}
      <MetricCard
        title="⚖️ System Load"
        subHeader="1m / 5m / 15m"
        value={metrics.load_1m || 0}
        unit=" 1m"
        colorClass={metrics.load_per_core > 1.2 ? "rose" : "emerald"}
        progressPercent={((metrics.load_per_core || 0) / 2) * 100}
        footerLeft={`5m: ${metrics.load_5m || 0} | 15m: ${metrics.load_15m || 0}`}
        footerRight={`${metrics.load_per_core || 0}/core`}
      />

      {/* RPS & Latency Card */}
      <MetricCard
        title="🚀 Throughput (RPS)"
        subHeader="Requests / Sec"
        value={metrics.rps ? metrics.rps.toLocaleString() : 0}
        unit=""
        colorClass="emerald"
        progressPercent={((metrics.rps || 0) / 100000) * 100}
        footerLeft={`p95: ${metrics.p95_latency_ms || 0}ms`}
        footerRight={`Errors: ${metrics.error_rate_pct || 0}%`}
      />

      {/* Network Transfer Card */}
      <MetricCard
        title="🌐 Bandwidth I/O"
        subHeader="Network Transfer Rate"
        value={metrics.network_rx_kbs ? metrics.network_rx_kbs.toLocaleString() : 0}
        unit=" KB/s"
        colorClass="amber"
        progressPercent={((metrics.network_rx_kbs || 0) / 50000) * 100}
        footerLeft={`⬇ RX: ${metrics.network_rx_kbs || 0} KB/s`}
        footerRight={`⬆ TX: ${metrics.network_tx_kbs || 0} KB/s`}
      />
    </div>
  );
}

export default MetricsGrid;
