#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions
if [ -d "/app/data" ]; then
    echo "Data directory exists, checking permissions..."
    
    # Check if we can write to the data directory
    if [ ! -w "/app/data" ]; then
        echo "ERROR: Data directory /app/data is not writable by current user ($(id -u):$(id -g))"
        echo "Please ensure the volume has correct permissions."
        echo "You can fix this by running: docker compose down && docker volume rm bookrequestarr_bookrequestarr-data"
        exit 1
    fi
    
    echo "Data directory is writable, proceeding..."
else
    echo "Creating data directory..."
    mkdir -p /app/data
fi

# Execute the main command
exec "$@"

