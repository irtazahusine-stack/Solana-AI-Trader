#!/bin/bash

echo "🚀 Starting Solana AI Trader..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your NoLimitNodes API key!"
fi

# Start the backend
echo "Starting backend server..."
python backend/main.py &
BACKEND_PID=$!

# Start frontend server
echo "Starting frontend server..."
cd frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!

echo "✅ Solana AI Trader is running!"
echo "   Backend API: http://localhost:8000"
echo "   Frontend UI: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait