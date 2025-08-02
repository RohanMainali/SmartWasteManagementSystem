#!/bin/bash

# SafaCycle Development Startup Script

echo "🚀 Starting SafaCycle Development Environment..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   brew services start mongodb/brew/mongodb-community"
    echo "   or"
    echo "   sudo systemctl start mongod"
    exit 1
fi

echo "✅ MongoDB is running"

# Start backend server in background
echo "🔧 Starting Backend API Server on port 5001..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend Expo server
echo "📱 Starting React Native Expo Development Server..."
cd ..
npm start &
FRONTEND_PID=$!

echo ""
echo "🎉 SafaCycle Development Environment Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Frontend (Expo): http://localhost:8081"
echo "🔧 Backend API: http://localhost:5001"
echo "🏥 Health Check: http://localhost:5001/health"
echo "🗄️  MongoDB: mongodb://localhost:27017/safacycle"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping SafaCycle Development Environment..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C to cleanup
trap cleanup SIGINT

# Wait for either process to finish
wait
