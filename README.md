# ⚡ Live Server Health Monitor

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-4A154B?style=for-the-badge&logo=slack&logoColor=white)
![SQLAlchemy Core](https://img.shields.io/badge/SQLAlchemy_Core-CC292B?style=for-the-badge&logo=python&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

A high-performance, real-time server health monitoring dashboard built with **FastAPI**, **WebSockets**, **PostgreSQL (SQLAlchemy Core)**, and **React (Vite)**. 

The system collects real hardware telemetry (CPU percentage, RAM memory usage, CPU temperature, system load averages, network I/O, and process telemetry) using `psutil`, persists telemetry records atomically in PostgreSQL, evaluates configurable alert threshold rules in real time, and streams live telemetry to a reactive dashboard without page refreshes.

---

## 📸 System Architecture & Data Flow

```
                                 ┌──────────────────────────────┐
                                 │   Physical Server / psutil   │
                                 └──────────────┬───────────────┘
                                                │ Hardware Telemetry (2s interval)
                                                ▼
                                 ┌──────────────────────────────┐
                                 │   FastAPI Backend (main.py)  │
                                 └──────┬────────────────┬──────┘
                                        │                │
           1. Write-Before-Send         │                │ 2. Live WebSocket Stream
          (SQLAlchemy Core Insert)      │                │   (/ws/metrics)
                                        ▼                ▼
                         ┌────────────────────┐   ┌──────────────────────────┐
                         │ PostgreSQL Database│   │ React Frontend (App.jsx) │
                         │ (readings table)   │   │ - Live Metric Cards      │
                         └────────────────────┘   │ - SVG Line Chart         │
                                                  │ - Live Warnings Feed     │
                                                  │ - Recent History Table   │
                                                  └──────────────────────────┘
```

### Key Architectural Principles
- **Write-Before-Send Telemetry Persistence**: Telemetry payload is inserted into the PostgreSQL `readings` table *before* being broadcast over WebSocket, guaranteeing database consistency.
- **Consecutive Warning Escalation**: Reaching **3 consecutive warning states** automatically upgrades node status to `CRITICAL` for aggressive incident handling.
- **Modular Component Architecture**: React frontend is organized into clean, single-purpose components under `frontend/src/components/`.

---

## ✨ Features & Capabilities

| Feature | Description |
| :--- | :--- |
| **⚡ Real-Time CPU & RAM Monitoring** | Live metric streaming powered by `psutil.cpu_percent()` and `psutil.virtual_memory().percent`. |
| **📈 Live SVG Trend Chart** | Real-time SVG line chart rendering the last 20 readings for CPU, RAM, and Temperature trends. |
| **🗄️ PostgreSQL History** | Telemetry logs stored via SQLAlchemy Core. Accessible via `GET /api/readings/recent?limit=10`. |
| **🚨 Live Warnings Feed & Resolve** | High load warnings are prepended live to a warning feed with single-click "✓ Resolve" actions. |
| **⚙️ Dynamic Alert Rules** | Configurable warning/critical threshold rules for CPU, RAM, Disk, and Temperature via `/api/alerts/config`. |
| **⚙️ Process Manager** | Real-time active system processes list with PID and name search filtering. |
| **🔒 Admin Authentication Guard** | Security layer guarding administrative actions via `POST /api/auth/login`. |
| **⚡ Traffic Spike Simulation** | One-click traffic load injection (`/api/simulate/spike`) and load shedding (`/api/simulate/handle-load`). |
| **📥 Telemetry CSV Export** | Download full telemetry history logs as CSV files via `/api/export`. |

---

## 📁 Repository Structure

```
Live-Server-Health-Monitor/
├── alembic/                      # Database schema migration scripts
│   ├── versions/                 # Revision scripts for database versions
│   └── env.py                    # Alembic environment configuration
├── alembic.ini                   # Alembic configuration settings
├── database.py                   # SQLAlchemy Core schema & engine setup
├── main.py                       # FastAPI application, WebSocket & REST APIs
├── requirements.txt              # Python package dependencies
├── start.sh                      # Unified one-command launch script
└── frontend/                     # React + Vite UI application
    ├── package.json              # Frontend dependencies
    ├── vite.config.js            # Vite build configuration
    └── src/
        ├── App.jsx               # Master React container & state manager
        ├── App.css               # Modern glassmorphism dark theme styles
        └── components/           # Single-file modular UI components
            ├── AnalyticsChart.jsx     # Live SVG line chart
            ├── AuthModal.jsx          # Admin authentication modal
            ├── MetricCard.jsx         # Reusable telemetry metric card
            ├── MetricsGrid.jsx        # Grid layout for metric cards
            ├── Navbar.jsx             # Header navigation bar & controls
            ├── NavTabs.jsx            # Tab navigation ribbon
            ├── ProcessManager.jsx     # Process list table & search
            ├── RecentHistoryTable.jsx # Database history table
            ├── SystemInfoBar.jsx      # Telemetry hero bar
            ├── ThresholdForm.jsx      # Alert rule settings form
            └── WarningsFeed.jsx       # Live warning log feed
```

---

## 🚀 Quick Start Guide

### Option 1: One-Command Startup (Recommended)

Simply run the launch script from the project root directory:

```bash
chmod +x start.sh
./start.sh
```

The script automatically activates the Python virtual environment, executes database migrations, launches the FastAPI server at `http://localhost:8000`, and starts the React Vite frontend at `http://localhost:5173`.

---

### Option 2: Manual Setup

#### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL database (`server_health`)

#### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI application
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 3. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

---

## 🌐 Application URLs & Credentials

| Resource | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **React Dashboard UI** | `http://localhost:5173` | Main Web Interface |
| **FastAPI Interactive Docs** | `http://localhost:8000/docs` | OpenAPI / Swagger UI |
| **WebSocket Telemetry Stream** | `ws://localhost:8000/ws/metrics` | Real-time JSON Stream |
| **Admin Login** | Auth Modal in UI | Username: `admin` \| Password: `admin123` |

---

## 🔌 API Reference

### WebSocket Endpoint
- `WS /ws/metrics`: Connect to stream real-time telemetry data every 2 seconds. Send node ID string (e.g. `"local"`) to switch target node.

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/readings/recent?limit=10` | Fetch the most recent telemetry readings from PostgreSQL. |
| `GET` | `/api/alerts/config` | Get current alert threshold settings. |
| `POST` | `/api/alerts/config` | Update warning and critical alert thresholds. |
| `POST` | `/api/auth/login` | Authenticate admin user (`admin` / `admin123`). |
| `POST` | `/api/simulate/spike` | Inject simulated high traffic spike for 15 seconds. |
| `POST` | `/api/simulate/handle-load` | Shed server load and stabilize CPU/thermal performance. |
| `GET` | `/api/export` | Export recorded telemetry history as a downloadable CSV. |
| `GET` | `/api/nodes` | List registered target nodes catalog. |

---

## 🛠️ Tech Stack

- **Backend**: Python 3, FastAPI, Uvicorn, Asyncio, Psutil
- **Database**: PostgreSQL, SQLAlchemy Core, Alembic Migrations
- **Frontend**: React 18, Vite, Vanilla CSS (Glassmorphism Dark Mode)
- **Protocol**: WebSockets (WS / WSS)

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.