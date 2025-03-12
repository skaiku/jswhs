#!/bin/bash

# Create the necessary directory structure
mkdir -p data/cache

# Copy config files to data directory if they don't exist there already
if [ ! -f data/config.json ]; then
  echo "Copying config.json to data directory..."
  cp config.json data/config.json
else
  echo "data/config.json already exists, skipping copy."
fi

if [ ! -f data/domains.json ]; then
  echo "Copying domains.json to data directory..."
  cp domains.json data/domains.json
else
  echo "data/domains.json already exists, skipping copy."
fi

echo "Setup complete. You can now run: docker-compose up -d" 