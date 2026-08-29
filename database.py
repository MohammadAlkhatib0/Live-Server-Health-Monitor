import os
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, Float, String, Boolean, DateTime, func

# 1. Database Address: Configurable via environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5432/server_health")


# 2. Engine: The magic bridge connecting Python to PostgreSQL
engine = create_engine(DATABASE_URL)

# 3. MetaData: The big folder holding all table designs
metadata = MetaData()

# 4. Readings Table: Digital telemetry log using SQLAlchemy Core
readings = Table(
    "readings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True), # Primary key ID
    Column("node_id", String, nullable=True, default="local"),   # Target node ID
    Column("value", Float, nullable=False),                      # CPU usage percentage
    Column("memory_value", Float, nullable=True, default=0.0),   # RAM memory percentage
    Column("disk_value", Float, nullable=True, default=0.0),     # Disk usage percentage
    Column("network_rx", Float, nullable=True, default=0.0),     # Network Inbound (KB/s)
    Column("network_tx", Float, nullable=True, default=0.0),     # Network Outbound (KB/s)
    Column("rps", Integer, nullable=True, default=0),            # Requests Per Second
    Column("latency_ms", Float, nullable=True, default=0.0),     # p95 Latency ms
    Column("error_rate", Float, nullable=True, default=0.0),     # Error rate percentage
    Column("process_count", Integer, nullable=True, default=0),  # Active running process count
    Column("status", String, nullable=False),                    # "ok", "warning", or "critical"
    Column("created_at", DateTime, server_default=func.now())    # Timestamp
)

# 5. Incidents Table: Tracking system incidents and resolution state
incidents_table = Table(
    "incidents",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("node_id", String, nullable=False, default="local"),
    Column("node_name", String, nullable=False, default="Local Host"),
    Column("status", String, nullable=False),                     # "warning" or "critical"
    Column("reason", String, nullable=False),
    Column("cpu_percent", Float, nullable=True, default=0.0),
    Column("memory_percent", Float, nullable=True, default=0.0),
    Column("resolved", Boolean, nullable=False, default=False),
    Column("created_at", DateTime, server_default=func.now()),
    Column("resolved_at", DateTime, nullable=True)
)


