# Domain Checker - Docker Setup

This document explains how to run the Domain Checker application using Docker.

## Quick Start

The easiest way to run the application is using Docker Compose:

```bash
# Run the setup script to create necessary directories and copy config files
./setup-docker.sh

# Start the application
docker-compose up -d
```

This will:
1. Create the necessary directory structure
2. Copy configuration files to the data directory
3. Build the Docker image if it doesn't exist
4. Start the container in detached mode
5. Make the application available at http://localhost:3000

## Directory Structure

The application uses the following directory structure:
- `./data/config.json` - Application settings
- `./data/domains.json` - List of domains to check
- `./data/cache/` - Cache directory for domain data

## Manual Docker Build and Run

If you prefer not to use Docker Compose, you can manually build and run the container:

### Build the Docker image

You can build the Docker image using either of these equivalent commands:

```bash
# Using docker build command
docker build -t domain-checker .

# Using docker image build command (alternative syntax)
docker image build -t domain-checker .
```

The `-t domain-checker` parameter tags the image with the name "domain-checker".

### Prepare directories and config files

```bash
# Create data directories
mkdir -p data/cache

# Copy config files if needed
cp config.json data/config.json
cp domains.json data/domains.json
```

### Run the container

```bash
docker run -d \
  --name domain-checker \
  -p 3000:3000 \
  -v "$(pwd)/data/cache:/app/cache" \
  -v "$(pwd)/data/config.json:/app/config.json:ro" \
  -v "$(pwd)/data/domains.json:/app/domains.json:ro" \
  domain-checker
```

## Configuration

The application uses two configuration files:
- `config.json`: Application settings
- `domains.json`: List of domains to check

These files are mounted as volumes from the `./data` directory, so you can edit them on your host machine without rebuilding the Docker image.

## Persistent Storage

The application's cache is stored in a local directory (`./data/cache`) that is mounted to the container's `/app/cache` directory. This allows you to easily access, backup, or manage the cached data directly from your host system.

## Image Optimizations

The Docker image has been optimized for minimal size by:
1. Using the lightweight Alpine-based Node.js image
2. Implementing a multi-stage build to exclude build tools
3. Running as a non-root user for improved security
4. Including only production dependencies

## Updating the Application

To update the application:

1. Pull the latest code changes
2. Rebuild the Docker image:
   ```bash
   docker-compose build
   ```
   
   Or manually:
   ```bash
   docker image build -t domain-checker .
   ```
3. Restart the container:
   ```bash
   docker-compose up -d
   ```
   
   Or manually:
   ```bash
   docker stop domain-checker
   docker rm domain-checker
   docker run -d \
     --name domain-checker \
     -p 3000:3000 \
     -v "$(pwd)/data/cache:/app/cache" \
     -v "$(pwd)/data/config.json:/app/config.json:ro" \
     -v "$(pwd)/data/domains.json:/app/domains.json:ro" \
     domain-checker
   ``` 

Domain Checker: A lightweight tool for monitoring domain expiration dates with push notifications. This containerized application tracks your domains, sends alerts when expiration dates approach, and provides a clean web interface for easy management. Built on Node.js with Alpine for minimal image size, it features persistent cache storage, configurable notification thresholds, and scheduled background checks. Perfect for webmasters, IT teams, and domain portfolio managers who never want to miss a renewal again.

Tags: domain-monitoring, expiration-checker, push-notifications, alpine, nodejs 