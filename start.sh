#!/bin/bash

echo "🚀 Starting Live Server Health Monitor..."

# 1. Activate virtual environment and run database migrations
source venv/bin/activate
alembic upgrade head

# 2. Start FastAPI Backend in background
echo "⚡ Starting Backend API on http://localhost:8000..."
uvicorn main:app --host 127.0.0.1 --port 8000 --reload &

# 3. Navigate to frontend and start Vite development server
echo "🖥️ Starting Frontend Dashboard on http://localhost:5173..."
cd frontend
npm run dev
