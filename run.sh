#!/usr/bin/with-contenv bashio

# ==============================================================================
# Home Assistant Firebase Bridge Addon
# ==============================================================================

bashio::log.info "Starting Firebase Bridge Addon..."

# Check if required files exist
if ! bashio::fs.file_exists "/config/firebase-service-account.json"; then
    bashio::log.warning "Firebase service account file not found at /config/firebase-service-account.json"
    bashio::log.info "Firebase features will be disabled"
fi

# Set environment variables
export NODE_ENV=production

# Start the application
bashio::log.info "Starting Node.js server..."
exec node server.js