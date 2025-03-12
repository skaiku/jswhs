#!/bin/sh

if [ ! -f "/app/data/config.json" ]; then
    echo "Config file not found. Copying default config.json..."
    cp /app/datadefault/config.json /app/data/config.json
    
else
    echo "Config file already exists."
fi

if [ ! -f "/app/data/domains.json" ]; then
    echo "Domains file not found. Copying default domains.json..."
    cp /app/datadefault/domains.json /app/data/domains.json
    
else
    echo "Domains file already exists."
fi

# Run the main app
exec "$@"