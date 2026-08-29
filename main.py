import asyncio
import time
import psutil
import platform
import random
import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, desc, update, delete, func
from database import engine, readings, incidents_table



# 1. Initialize FastAPI Enterprise Server App
app = FastAPI(
    title="Enterprise Cloud Observability & Service Simulator",
    description="Multi-region cluster node monitoring, web service status simulation & traffic load testing",
    version="3.0.0"
)

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize psutil counters for local host
psutil.cpu_percent(interval=None, percpu=True)
boot_time = psutil.boot_time()

# Network rate tracking variables
last_net_check = time.time()
net_counters = psutil.net_io_counters()
last_bytes_recv = net_counters.bytes_recv
last_bytes_sent = net_counters.bytes_sent

# Spike Simulation State
spike_until_time = 0.0

# Configurable Alert Thresholds
alert_config = {
    "cpu_warning": 75.0,
    "cpu_critical": 90.0,
    "memory_warning": 80.0,
    "memory_critical": 95.0,
    "disk_warning": 85.0,
    "disk_critical": 95.0,
    "temp_warning": 75.0,
    "temp_critical": 85.0,
}

consecutive_warnings = 0

class AlertConfigModel(BaseModel):
    cpu_warning: float
    cpu_critical: float
    memory_warning: float
    memory_critical: float
    disk_warning: float
    disk_critical: float
    temp_warning: float
    temp_critical: float

# Enterprise Node Catalog & Big Web Services
NODES_CATALOG = [
    {
        "id": "local",
        "name": "💻 Local Host Machine",
        "category": "Primary Host",
        "region": "Localhost",
        "status": "online",
        "provider": "Physical Host"
    },
    {
        "id": "us-east-1",
        "name": "🏢 US-East Primary App Cluster",
        "category": "Production Cluster",
        "region": "us-east-1 (N. Virginia)",
        "status": "online",
        "provider": "AWS EC2"
    },
    {
        "id": "eu-west-1",
        "name": "🗄️ EU-West Database Core",
        "category": "Production Database",
        "region": "eu-west-1 (Ireland)",
        "status": "online",
        "provider": "AWS Aurora PostgreSQL"
    },
    {
        "id": "ap-southeast-1",
        "name": "⚡ Asia-Pacific Edge CDN",
        "category": "CDN & Anycast Edge",
        "region": "ap-southeast-1 (Singapore)",
        "status": "online",
        "provider": "Cloudflare Edge"
    },
    {
        "id": "us-west-2",
        "name": "🤖 US-West AI Model Cluster",
        "category": "GPU Compute Cluster",
        "region": "us-west-2 (Oregon)",
        "status": "online",
        "provider": "NVIDIA H100 Cluster"
    },
    {
        "id": "aws-cloud",
        "name": "☁️ AWS Infrastructure",
        "category": "Cloud Platform",
        "region": "Global Multi-AZ",
        "status": "healthy",
        "provider": "Amazon Web Services"
    },
    {
        "id": "google-cloud",
        "name": "🌐 Google Cloud Platform",
        "category": "Cloud Platform",
        "region": "Global Backbone",
        "status": "healthy",
        "provider": "Google Cloud"
    },
    {
        "id": "stripe-payments",
        "name": "💳 Stripe Payment API",
        "category": "SaaS Platform",
        "region": "Global Payments",
        "status": "healthy",
        "provider": "Stripe Inc."
    },
    {
        "id": "openai-api",
        "name": "🧠 OpenAI Model Engine",
        "category": "AI API Service",
        "region": "us-central-1",
        "status": "healthy",
        "provider": "OpenAI Infrastructure"
    }
]

def get_uptime_str() -> str:
    """Formatted system uptime string."""
    uptime_seconds = int(time.time() - boot_time)
    days, remainder = divmod(uptime_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    return f"{hours}h {minutes}m {seconds}s"

def get_cpu_temperature(node_id: str = "local", cpu_total: float = 0.0, is_spiking: bool = False) -> float:
    """Read hardware CPU temperature or estimate realistically based on workload."""
    if node_id == "local":
        try:
            temps = getattr(psutil, "sensors_temperatures", lambda: {})()
            for key in ["coretemp", "cpu-thermal", "cpu_thermal", "k10temp", "zenpower", "nvme"]:
                if key in temps and temps[key]:
                    valid_temps = [item.current for item in temps[key] if item.current is not None and item.current > 0]
                    if valid_temps:
                        base_temp = max(valid_temps)
                        return min(round(base_temp + (12.0 if is_spiking else 0.0), 1), 99.5)
        except Exception:
            pass

    # Dynamic baseline temperature calculation fallback
    base = 40.0 + (cpu_total * 0.42) + random.uniform(-1.5, 1.5)
    if is_spiking:
        base += random.uniform(15.0, 25.0)
    return min(round(base, 1), 98.5)

def get_system_load(node_id: str = "local", cpu_total: float = 0.0, cpu_count: int = 1, is_spiking: bool = False) -> Dict[str, float]:
    """Capture real 1m/5m/15m load averages or calculate proportional load for cluster nodes."""
    if node_id == "local" and hasattr(os, "getloadavg"):
        try:
            l1, l5, l15 = os.getloadavg()
            multiplier = 1.6 if is_spiking else 1.0
            return {
                "load_1m": round(l1 * multiplier, 2),
                "load_5m": round(l5 * multiplier, 2),
                "load_15m": round(l15 * multiplier, 2)
            }
        except Exception:
            pass

    norm = (cpu_total / 100.0) * cpu_count
    l1 = max(round(norm * (1.85 if is_spiking else 0.75) + random.uniform(-0.1, 0.2), 2), 0.1)
    l5 = max(round(l1 * 0.88, 2), 0.1)
    l15 = max(round(l1 * 0.76, 2), 0.1)
    return {"load_1m": l1, "load_5m": l5, "load_15m": l15}

def get_top_processes(limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch top running processes sorted by CPU and Memory usage."""
    procs = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status', 'username']):
        try:
            info = proc.info
            if info['name']:
                procs.append({
                    "pid": info['pid'],
                    "name": info['name'],
                    "cpu_percent": round(info['cpu_percent'] or 0.0, 1),
                    "memory_percent": round(info['memory_percent'] or 0.0, 1),
                    "status": info['status'] or "running",
                    "user": info['username'] or "system"
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    procs.sort(key=lambda p: (p['cpu_percent'], p['memory_percent']), reverse=True)
    return procs[:limit]

def generate_container_pods(node_id: str, is_spiking: bool) -> List[Dict[str, Any]]:
    """Generate 24 container pod status indicators for the cluster matrix."""
    services = ["auth-service", "payment-api", "user-vault", "analytics-worker", "cache-redis", "ingress-nginx", "db-proxy", "queue-rabbit"]
    pods = []
    for i in range(1, 25):
        service_name = services[(i - 1) % len(services)]
        pod_id = f"{node_id}-{service_name}-{i:02d}"
        
        if is_spiking and (i % 3 == 0 or i % 5 == 0):
            pod_status = "degraded" if i % 2 == 0 else "critical"
            cpu_val = round(random.uniform(85.0, 99.9), 1)
            mem_val = round(random.uniform(88.0, 98.0), 1)
        else:
            pod_status = "healthy"
            cpu_val = round(random.uniform(12.0, 48.0), 1)
            mem_val = round(random.uniform(25.0, 65.0), 1)
            
        pods.append({
            "id": pod_id,
            "name": f"{service_name}-pod-{i}",
            "status": pod_status,
            "cpu": cpu_val,
            "memory": mem_val,
            "restarts": random.randint(0, 3) if not is_spiking else random.randint(4, 18)
        })
    return pods

def get_node_telemetry(node_id: str = "local") -> Dict[str, Any]:
    """Capture real or simulated multi-node telemetry."""
    global last_net_check, last_bytes_recv, last_bytes_sent, consecutive_warnings
    
    now = time.time()
    is_spiking = now < spike_until_time

    # 1. Local Machine Real Telemetry
    if node_id == "local":
        elapsed = max(now - last_net_check, 0.5)
        last_net_check = now
        
        cpu_total = psutil.cpu_percent(interval=None)
        if is_spiking:
            cpu_total = min(round(cpu_total + random.uniform(50.0, 75.0), 1), 99.9)
            
        cpu_cores = psutil.cpu_percent(interval=None, percpu=True)
        cpu_count = psutil.cpu_count(logical=True)
        
        mem = psutil.virtual_memory()
        mem_percent = min(round(mem.percent + (30.0 if is_spiking else 0.0), 1), 99.5)
        
        disk = psutil.disk_usage('/')
        
        current_net = psutil.net_io_counters()
        rx_rate = round((current_net.bytes_recv - last_bytes_recv) / (1024 * elapsed), 1)
        tx_rate = round((current_net.bytes_sent - last_bytes_sent) / (1024 * elapsed), 1)
        last_bytes_recv = current_net.bytes_recv
        last_bytes_sent = current_net.bytes_sent
        
        if is_spiking:
            rx_rate += round(random.uniform(12000.0, 45000.0), 1)
            tx_rate += round(random.uniform(8000.0, 32000.0), 1)

        rps = int(random.uniform(12500, 18900)) if is_spiking else int(random.uniform(450, 1200))
        p95_latency = round(random.uniform(140.0, 420.0), 1) if is_spiking else round(random.uniform(8.0, 18.0), 1)
        error_rate = round(random.uniform(3.5, 8.9), 2) if is_spiking else round(random.uniform(0.01, 0.05), 2)

        process_count = len(psutil.pids())
        top_procs = get_top_processes(8)
        
        node_info = NODES_CATALOG[0]

    # 2. Simulated Enterprise Cloud Clusters / Web Services
    else:
        node_info = next((n for n in NODES_CATALOG if n["id"] == node_id), NODES_CATALOG[1])
        
        # Base metrics depending on node type
        if "us-east" in node_id:
            cpu_total = round(random.uniform(78.0, 94.0) if is_spiking else random.uniform(32.0, 58.0), 1)
            mem_percent = round(random.uniform(82.0, 95.0) if is_spiking else random.uniform(55.0, 72.0), 1)
            disk = type('obj', (object,), {'percent': 42.5, 'used': 284 * 1024**3, 'total': 1000 * 1024**3})()
            rps = int(random.uniform(45000, 85000)) if is_spiking else int(random.uniform(14200, 18500))
            p95_latency = round(random.uniform(220.0, 510.0), 1) if is_spiking else round(random.uniform(12.0, 24.0), 1)
            rx_rate = round(random.uniform(45000.0, 98000.0), 1)
            tx_rate = round(random.uniform(38000.0, 82000.0), 1)
            cpu_count = 64
        elif "eu-west" in node_id:
            cpu_total = round(random.uniform(85.0, 98.0) if is_spiking else random.uniform(45.0, 68.0), 1)
            mem_percent = round(random.uniform(88.0, 97.0) if is_spiking else random.uniform(62.0, 78.0), 1)
            disk = type('obj', (object,), {'percent': 68.2, 'used': 1364 * 1024**3, 'total': 2000 * 1024**3})()
            rps = int(random.uniform(28000, 55000)) if is_spiking else int(random.uniform(8400, 11200))
            p95_latency = round(random.uniform(180.0, 380.0), 1) if is_spiking else round(random.uniform(18.0, 32.0), 1)
            rx_rate = round(random.uniform(22000.0, 54000.0), 1)
            tx_rate = round(random.uniform(19000.0, 48000.0), 1)
            cpu_count = 32
        elif "stripe" in node_id or "openai" in node_id:
            cpu_total = round(random.uniform(82.0, 99.0) if is_spiking else random.uniform(28.0, 49.0), 1)
            mem_percent = round(random.uniform(75.0, 92.0) if is_spiking else random.uniform(48.0, 64.0), 1)
            disk = type('obj', (object,), {'percent': 24.0, 'used': 120 * 1024**3, 'total': 500 * 1024**3})()
            rps = int(random.uniform(95000, 140000)) if is_spiking else int(random.uniform(32000, 45000))
            p95_latency = round(random.uniform(350.0, 780.0), 1) if is_spiking else round(random.uniform(25.0, 45.0), 1)
            rx_rate = round(random.uniform(75000.0, 160000.0), 1)
            tx_rate = round(random.uniform(64000.0, 140000.0), 1)
            cpu_count = 128
        else: # Default simulated node
            cpu_total = round(random.uniform(70.0, 92.0) if is_spiking else random.uniform(22.0, 42.0), 1)
            mem_percent = round(random.uniform(65.0, 88.0) if is_spiking else random.uniform(38.0, 54.0), 1)
            disk = type('obj', (object,), {'percent': 35.0, 'used': 175 * 1024**3, 'total': 500 * 1024**3})()
            rps = int(random.uniform(18000, 34000)) if is_spiking else int(random.uniform(4200, 6800))
            p95_latency = round(random.uniform(90.0, 210.0), 1) if is_spiking else round(random.uniform(9.0, 16.0), 1)
            rx_rate = round(random.uniform(15000.0, 38000.0), 1)
            tx_rate = round(random.uniform(12000.0, 29000.0), 1)
            cpu_count = 32

        cpu_cores = [round(min(cpu_total + random.uniform(-10.0, 10.0), 99.9), 1) for _ in range(8)]
        error_rate = round(random.uniform(2.8, 7.5), 2) if is_spiking else round(random.uniform(0.01, 0.04), 2)
        process_count = 1240 if is_spiking else 420
        top_procs = [
            {"pid": 1042, "name": "kubernetes-ingress", "cpu_percent": round(cpu_total * 0.35, 1), "memory_percent": 8.4, "status": "running", "user": "root"},
            {"pid": 2180, "name": "postgres-primary", "cpu_percent": round(cpu_total * 0.28, 1), "memory_percent": 24.2, "status": "running", "user": "postgres"},
            {"pid": 3041, "name": "redis-cluster-node", "cpu_percent": round(cpu_total * 0.15, 1), "memory_percent": 12.1, "status": "running", "user": "redis"},
            {"pid": 4109, "name": "grpc-gateway", "cpu_percent": round(cpu_total * 0.12, 1), "memory_percent": 5.4, "status": "running", "user": "app"}
        ]
        
        mem = type('obj', (object,), {
            'percent': mem_percent,
            'used': round((mem_percent / 100) * (64 * 1024**3), 2),
            'total': 64 * 1024**3
        })()

    # Calculate Temperature & Load Averages
    temperature = get_cpu_temperature(node_id, cpu_total, is_spiking)
    load_metrics = get_system_load(node_id, cpu_total, cpu_count, is_spiking)
    load_1m = load_metrics["load_1m"]
    load_5m = load_metrics["load_5m"]
    load_15m = load_metrics["load_15m"]
    load_per_core = round(load_1m / max(cpu_count, 1), 2)

    # Determine Status & Reasons
    status = "ok"
    reasons = []
    
    if cpu_total >= alert_config["cpu_critical"] or mem.percent >= alert_config["memory_critical"] or temperature >= alert_config["temp_critical"]:
        status = "critical"
        if cpu_total >= alert_config["cpu_critical"]:
            reasons.append(f"CPU Critical Spike ({cpu_total}%)")
        if mem.percent >= alert_config["memory_critical"]:
            reasons.append(f"RAM Memory Exhaustion ({mem.percent}%)")
        if temperature >= alert_config["temp_critical"]:
            reasons.append(f"Thermal Critical Overheat ({temperature}°C)")
    elif cpu_total >= alert_config["cpu_warning"] or mem.percent >= alert_config["memory_warning"] or temperature >= alert_config["temp_warning"]:
        status = "warning"
        if cpu_total >= alert_config["cpu_warning"]:
            reasons.append(f"High CPU Load ({cpu_total}%)")
        if mem.percent >= alert_config["memory_warning"]:
            reasons.append(f"High Memory Usage ({mem.percent}%)")
        if temperature >= alert_config["temp_warning"]:
            reasons.append(f"High Hardware Temperature ({temperature}°C)")

    if load_per_core >= 1.5:
        if status == "ok":
            status = "warning"
        reasons.append(f"High System Load Ratio ({load_1m} / {cpu_count} cores)")

    container_pods = generate_container_pods(node_id, is_spiking)

    return {
        "node_id": node_id,
        "node_info": node_info,
        "timestamp": int(now),
        "cpu": cpu_total,
        "cpu_cores": cpu_cores,
        "cpu_count": cpu_count,
        "memory": mem.percent,
        "memory_used_gb": round(mem.used / (1024**3), 2),
        "memory_total_gb": round(mem.total / (1024**3), 2),
        "swap_percent": getattr(psutil.swap_memory(), 'percent', 0.0),
        "disk": disk.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "temperature": temperature,
        "load_1m": load_1m,
        "load_5m": load_5m,
        "load_15m": load_15m,
        "load_per_core": load_per_core,
        "load_status": "heavy" if load_per_core > 1.2 else ("moderate" if load_per_core > 0.7 else "optimal"),
        "network_rx_kbs": max(rx_rate, 0.0),
        "network_tx_kbs": max(tx_rate, 0.0),
        "rps": rps,
        "p95_latency_ms": p95_latency,
        "error_rate_pct": error_rate,
        "process_count": process_count,
        "uptime": get_uptime_str(),
        "platform": f"{platform.system()} {platform.release()}",
        "status": status,
        "is_spiking": is_spiking,
        "alert_reasons": reasons,
        "top_processes": top_procs,
        "container_pods": container_pods,
        "nodes_catalog": NODES_CATALOG,
        "thresholds": alert_config
    }

def record_incident_if_needed(metrics: Dict[str, Any]):
    """Log incident to database when warning/critical status occurs, avoiding duplicates."""
    if metrics["status"] not in ["warning", "critical"]:
        return

    node_id = metrics.get("node_id", "local")
    node_name = metrics.get("node_info", {}).get("name", node_id)
    reasons = metrics.get("alert_reasons", [])
    reason_str = ", ".join(reasons) if reasons else f"High System Load ({metrics['cpu']}% CPU)"

    try:
        # Check if an unresolved incident already exists for this node
        stmt = select(incidents_table).where(
            (incidents_table.c.node_id == node_id) & (incidents_table.c.resolved == False)
        ).limit(1)

        with engine.connect() as conn:
            existing = conn.execute(stmt).first()
            if not existing:
                ins = incidents_table.insert().values(
                    node_id=node_id,
                    node_name=node_name,
                    status=metrics["status"],
                    reason=reason_str,
                    cpu_percent=metrics["cpu"],
                    memory_percent=metrics["memory"],
                    resolved=False
                )
                conn.execute(ins)
                conn.commit()
    except Exception as e:
        print(f"Incident log error: {e}")

def save_reading_to_db(metrics: Dict[str, Any]):
    """Persist telemetry reading into PostgreSQL using SQLAlchemy Core."""
    try:
        stmt = readings.insert().values(
            node_id=metrics.get("node_id", "local"),
            value=metrics["cpu"],
            memory_value=metrics["memory"],
            disk_value=metrics["disk"],
            network_rx=metrics.get("network_rx_kbs", 0.0),
            network_tx=metrics.get("network_tx_kbs", 0.0),
            rps=metrics.get("rps", 0),
            latency_ms=metrics.get("p95_latency_ms", 0.0),
            error_rate=metrics.get("error_rate_pct", 0.0),
            process_count=metrics.get("process_count", 0),
            temperature=metrics.get("temperature", 45.0),
            load_1m=metrics.get("load_1m", 0.0),
            load_5m=metrics.get("load_5m", 0.0),
            load_15m=metrics.get("load_15m", 0.0),
            status=metrics["status"]
        )
        with engine.connect() as conn:
            conn.execute(stmt)
            conn.commit()
            
        record_incident_if_needed(metrics)
    except Exception as e:
        print(f"Database save error: {e}")

# REST API Endpoints

@app.get("/api/nodes")
def get_nodes_catalog():
    """List available cluster nodes & simulated web services."""
    return NODES_CATALOG

@app.get("/api/nodes/{node_id}/metrics")
def get_node_metrics(node_id: str):
    """Read telemetry for node, persist to database, then return to frontend."""
    metrics = get_node_telemetry(node_id)
    save_reading_to_db(metrics)
    return metrics

@app.get("/api/metrics/current")
def get_current_metrics():
    """Get default local system telemetry snapshot, saving to database first."""
    metrics = get_node_telemetry("local")
    save_reading_to_db(metrics)
    return metrics

@app.post("/api/simulate/spike")
def inject_traffic_spike():
    """Simulate intense Cyber Monday traffic spike for 15 seconds."""
    global spike_until_time
    spike_until_time = time.time() + 15.0
    return {
        "message": "⚡ High Traffic Spike injected successfully for 15 seconds!",
        "spike_until": spike_until_time
    }

@app.post("/api/simulate/handle-load")
def handle_server_load():
    """Shed excess traffic load, clear active spikes, and stabilize node performance."""
    global spike_until_time, consecutive_warnings
    spike_until_time = 0.0
    consecutive_warnings = 0
    return {
        "message": "🛡️ Load handled successfully! Excess traffic shed & system stabilized.",
        "timestamp": int(time.time()),
        "status": "stabilized"
    }

# Incidents API Endpoints

@app.get("/api/incidents")
def get_incidents(resolved: Optional[bool] = False):
    """Fetch active or historical incidents from PostgreSQL database."""
    try:
        query = select(incidents_table)
        if resolved is not None:
            query = query.where(incidents_table.c.resolved == resolved)
        query = query.order_by(desc(incidents_table.c.id)).limit(50)

        with engine.connect() as conn:
            result = conn.execute(query).mappings().all()
            return [dict(row) for row in result]
    except Exception as e:
        print(f"Fetch incidents error: {e}")
        return []

@app.post("/api/incidents/{incident_id}/resolve")
def resolve_incident_by_id(incident_id: int):
    """Mark specific incident as resolved in PostgreSQL database."""
    try:
        stmt = update(incidents_table).where(incidents_table.c.id == incident_id).values(
            resolved=True,
            resolved_at=func.now()
        )
        with engine.connect() as conn:
            conn.execute(stmt)
            conn.commit()
        return {"message": f"Incident #{incident_id} successfully resolved in database.", "incident_id": incident_id}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/incidents/resolve-all")
def resolve_all_incidents():
    """Mark ALL active incidents as resolved in PostgreSQL database."""
    try:
        stmt = update(incidents_table).where(incidents_table.c.resolved == False).values(
            resolved=True,
            resolved_at=func.now()
        )
        with engine.connect() as conn:
            result = conn.execute(stmt)
            conn.commit()
            return {"message": "All incidents successfully resolved in database.", "count": result.rowcount}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/readings/recent")
def get_recent_readings(limit: int = Query(20, ge=1, le=100)):
    """Fetch recent historical telemetry readings from PostgreSQL database."""
    try:
        stmt = select(readings).order_by(desc(readings.c.id)).limit(limit)
        with engine.connect() as conn:
            result = conn.execute(stmt)
            return [dict(row) for row in result.mappings()]
    except Exception as e:
        return []

@app.get("/api/processes")
def get_processes(limit: int = Query(15, ge=1, le=50)):
    """Get real-time top CPU and memory consuming processes."""
    return get_top_processes(limit)

@app.get("/api/alerts/config")
def get_alert_config():
    """Get current threshold settings."""
    return alert_config

@app.post("/api/alerts/config")
def update_alert_config(new_config: AlertConfigModel):
    """Update threshold settings dynamically."""
    global alert_config
    alert_config.update(new_config.model_dump())
    return {"message": "Alert thresholds updated successfully", "config": alert_config}

@app.get("/api/export")
def export_readings_csv():
    """Export database readings as downloadable CSV file."""
    try:
        stmt = select(readings).order_by(desc(readings.c.id)).limit(500)
        with engine.connect() as conn:
            result = conn.execute(stmt).mappings().all()
        
        csv_lines = ["id,node_id,cpu_percent,memory_percent,disk_percent,temperature_c,load_1m,load_5m,load_15m,network_rx_kbs,network_tx_kbs,rps,latency_ms,error_rate,process_count,status,created_at\n"]
        for row in result:
            csv_lines.append(f"{row['id']},{row.get('node_id','local')},{row['value']},{row['memory_value']},{row.get('disk_value',0)},{row.get('temperature',45.0)},{row.get('load_1m',0)},{row.get('load_5m',0)},{row.get('load_15m',0)},{row.get('network_rx',0)},{row.get('network_tx',0)},{row.get('rps',0)},{row.get('latency_ms',0)},{row.get('error_rate',0)},{row.get('process_count',0)},{row['status']},{row['created_at']}\n")
        
        csv_content = "".join(csv_lines)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=server_metrics_export.csv"})
    except Exception as e:
        return Response(content=f"Error exporting CSV: {e}", status_code=500)

# Real-Time WebSocket Endpoint

@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket, node_id: Optional[str] = "local"):
    """Backend telemetry loop: reads data, saves to PostgreSQL, and streams payload to frontend."""
    await websocket.accept()
    active_node = node_id or "local"
    try:
        while True:
            # Check for incoming client message to switch node
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                if msg and msg.strip():
                    active_node = msg.strip()
            except asyncio.TimeoutError:
                pass

            metrics = get_node_telemetry(active_node)
            save_reading_to_db(metrics)
            await websocket.send_json(metrics)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")




