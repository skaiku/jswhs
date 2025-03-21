FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Second stage: minimal runtime
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Copy only production dependencies from the builder stage
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup public/ ./public/
COPY --chown=appuser:appgroup data/ ./datadefault/
# Config files will be mounted from host
# COPY --chown=appuser:appgroup c/onfig.json ./
# COPY --chown=appuser:appgroup domains.json ./
COPY --chown=appuser:appgroup package.json ./

# Create directory for cache with appropriate permissions
#RUN mkdir -p cache && chown -R appuser:appgroup cache
COPY --chown=appuser:appgroup entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# Expose port
EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
# Command to run the application
CMD ["node", "src/index.js"] 