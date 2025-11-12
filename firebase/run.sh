#!/usr/bin/env bash
set -e

echo "Starting Firebase Bridge Addon..."

# Check if required files exist
if [ ! -f "/config/firebase-service-account.json" ]; then
    echo "WARNING: Firebase service account file not found at /config/firebase-service-account.json"
    echo "Firebase features will be disabled"
fi

# Set environment variables
export NODE_ENV=production

# Start the application
echo "Starting Node.js server..."
exec node server.js