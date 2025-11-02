# syntax=docker/dockerfile:1

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Build the application (DATABASE_URL needed for build-time analysis)
RUN DATABASE_URL=:memory: npm run build && \
    npm prune --omit=dev

# Production stage
FROM node:24-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache tini

# Copy package files
COPY package.json package-lock.json ./

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Note: No USER directive - user is set via docker-compose or --user flag
# This allows the container to run as the host user, avoiding permission issues

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=/app/data/bookrequestarr.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini to handle signals properly and run entrypoint script
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["node", "build"]

