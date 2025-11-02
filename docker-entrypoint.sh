#!/bin/sh
set -e

# Ensure data directory exists
if [ ! -d "/app/data" ]; then
    echo "Creating data directory..."
    mkdir -p /app/data
fi

# Check if we can write to the data directory
if [ ! -w "/app/data" ]; then
    echo "ERROR: Data directory /app/data is not writable by current user ($(id -u):$(id -g))"
    echo "Current directory permissions:"
    ls -ld /app/data
    echo ""
    echo "To fix this issue:"
    echo "  1. Stop the container: docker compose down"
    echo "  2. Fix permissions: sudo chown -R \$(id -u):\$(id -g) ./data"
    echo "  3. Start again: docker compose up -d"
    exit 1
fi

echo "Data directory is ready at /app/data (owned by $(stat -c '%u:%g' /app/data))"

# Execute the main command
exec "$@"

