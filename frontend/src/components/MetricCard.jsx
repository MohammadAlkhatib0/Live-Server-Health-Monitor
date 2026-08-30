import React from "react";

export function MetricCard({
  title,
  subHeader,
  value,
  unit = "%",
  colorClass = "cyan",
  progressPercent = 0,
  footerLeft,
  footerRight
}) {
  return (
    <div className="metric-card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {subHeader && <span className="card-subtext">{subHeader}</span>}
      </div>
      <div className={`card-value ${colorClass}`}>
        {value}{unit}
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${colorClass}`}
          style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
        ></div>
      </div>
      <div className="card-subtext">
        <span>{footerLeft}</span>
        <span>{footerRight}</span>
      </div>
    </div>
  );
}

export default MetricCard;
