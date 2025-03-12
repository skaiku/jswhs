# Domain Checker - Docker Setup

This document explains how to run the Domain Checker application using Docker.

## Quick Start

The easiest way to run the application is using Docker Compose:

```bash
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



### Run the container

```bash
docker run -d \
  --name domain-checker \
  -p 3000:3000 \
  -v ${PWD}/data:/app/data \
  domain-checker
```

## Configuration

The application uses two configuration files:
- `config.json`: Application settings
- `domains.json`: List of domains to check

These files are mounted as volumes from the `./data` directory, so you can edit them on your host machine without rebuilding the Docker image.

## Persistent Storage

The application's cache is stored in a local directory (`./data/cache`) that is mounted to the container's `/app/data/cache` directory. This allows you to easily access, backup, or manage the cached data directly from your host system.


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
     -v "$(pwd)/data:/app/data/cache" \
     domain-checker
   ``` 

# Using docker hub repository


Simply run 
```
docker run -d -p 3000:3000 -v ${PWD}/data:/app/data  dytomi/jswhs
```

Or docker-compose.yaml
```
version: '3.8'

services:
  app:
    image: dytomi/jswhs
    container_name: domain-check
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data

```