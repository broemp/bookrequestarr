#!/bin/bash
set -e

echo "🚀 Starting Bookrequestarr..."
echo ""

# Create data directory if it doesn't exist
if [ ! -d "./data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p ./data
    echo "✅ Data directory created"
else
    echo "✅ Data directory exists"
fi

# Export UID and GID for docker-compose
export UID=$(id -u)
export GID=$(id -g)

echo "👤 Running as user $UID:$GID"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   Please edit .env with your configuration before continuing"
        echo ""
        read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
    else
        echo "   Error: .env.example not found"
        exit 1
    fi
fi

# Start docker compose
echo "🐳 Starting Docker containers..."
docker compose up -d

echo ""
echo "✅ Bookrequestarr is starting!"
echo "📊 View logs: docker compose logs -f"
echo "🌐 Access at: http://localhost:${PORT:-3000}"
echo "🛑 Stop: docker compose down"

