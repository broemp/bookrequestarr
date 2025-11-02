# Deployment Guide

This guide covers deploying Bookrequestarr using Docker and Docker Compose.

## Quick Start with Docker Compose

1. **Clone the repository:**
```bash
git clone https://github.com/broemp/bookrequestarr.git
cd bookrequestarr
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Edit `.env` with your configuration:**
```bash
# Required variables
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_secure_random_string
HARDCOVER_API_KEY=your_hardcover_api_key
PUBLIC_APP_URL=http://localhost:3000
```

4. **Start the application:**
```bash
# Option A: Use the helper script (recommended)
./start.sh

# Option B: Start manually
export UID=$(id -u) GID=$(id -g)
docker compose up -d
```

5. **Access the application:**
Open your browser to `http://localhost:3000`

**Note:** The application runs as your current user (UID:GID) to avoid permission issues with the data directory.

## Docker Deployment

### Using Pre-built Images (Recommended)

Pull and run the latest image from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/broemp/bookrequestarr:latest

# Create data directory
mkdir -p data

# Run the container
docker run -d \
  --name bookrequestarr \
  --user "$(id -u):$(id -g)" \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL=/app/data/bookrequestarr.db \
  -e OIDC_ISSUER=https://your-oidc-provider.com \
  -e OIDC_CLIENT_ID=your-client-id \
  -e OIDC_CLIENT_SECRET=your-client-secret \
  -e OIDC_REDIRECT_URI=https://your-domain.com/api/auth/callback \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -e PUBLIC_APP_URL=https://your-domain.com \
  -e HARDCOVER_API_KEY=your-api-key \
  ghcr.io/broemp/bookrequestarr:latest
```

### Build from Source

If you prefer to build the image yourself:

```bash
# Build the image
docker build -t bookrequestarr .

# Create data directory
mkdir -p data

# Run the container
docker run -d \
  --name bookrequestarr \
  --user "$(id -u):$(id -g)" \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL=/app/data/bookrequestarr.db \
  -e OIDC_ISSUER=https://your-oidc-provider.com \
  -e OIDC_CLIENT_ID=your-client-id \
  -e OIDC_CLIENT_SECRET=your-client-secret \
  -e OIDC_REDIRECT_URI=https://your-domain.com/api/auth/callback \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -e PUBLIC_APP_URL=https://your-domain.com \
  -e HARDCOVER_API_KEY=your-api-key \
  bookrequestarr
```

## Development Setup

### Without Docker

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run database migrations:**
```bash
npm run db:migrate
```

4. **Start development server:**
```bash
npm run dev
```

### Quick Development Mode (No OIDC)

For rapid development without setting up OIDC:

```bash
# Add to your .env file
DISABLE_AUTH=true
```

This will automatically log you in as an admin user. **Never use this in production!**

## Production Deployment

### Behind Reverse Proxy

#### Traefik

```yaml
services:
  bookrequestarr:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bookrequestarr.rule=Host(`books.example.com`)"
      - "traefik.http.routers.bookrequestarr.entrypoints=websecure"
      - "traefik.http.routers.bookrequestarr.tls.certresolver=letsencrypt"
      - "traefik.http.services.bookrequestarr.loadbalancer.server.port=3000"
```

#### Nginx

```nginx
server {
    listen 80;
    server_name books.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Health Checks

The container includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Docker will automatically monitor container health:
```bash
docker ps  # Shows health status
```

## Maintenance

### Viewing Logs

```bash
docker compose logs -f bookrequestarr
```

### Updating the Application

#### Using Docker Compose

```bash
# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d

# Remove old images
docker image prune -f
```

#### Using Docker directly

```bash
# Pull latest image
docker pull ghcr.io/broemp/bookrequestarr:latest

# Stop and remove old container
docker stop bookrequestarr
docker rm bookrequestarr

# Run new container with same configuration
docker run -d \
  --name bookrequestarr \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  [... your environment variables ...] \
  ghcr.io/broemp/bookrequestarr:latest

# Remove old images
docker image prune -f
```

### Backup Database

```bash
# Using volume
docker run --rm \
  -v bookrequestarr-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/bookrequestarr-backup.tar.gz /data

# Using bind mount
tar czf bookrequestarr-backup.tar.gz ./data
```

### Restore Database

```bash
# Using volume
docker run --rm \
  -v bookrequestarr-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd / && tar xzf /backup/bookrequestarr-backup.tar.gz"

# Using bind mount
tar xzf bookrequestarr-backup.tar.gz
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs bookrequestarr
```

Verify environment variables:
```bash
docker compose config
```

### Database permission errors

Ensure the data directory has correct permissions:
```bash
chmod -R 755 ./data
```

### Health check failing

Test the health endpoint manually:
```bash
docker exec bookrequestarr wget -q -O- http://localhost:3000/health
```

### Build cache issues

Clear build cache:
```bash
docker builder prune -af
```

Rebuild without cache:
```bash
docker compose build --no-cache
```

## Security Best Practices

1. **Use secrets for sensitive data** - Use Docker secrets or external secret management
2. **Run as non-root user** - The Dockerfile already configures a non-root user
3. **Keep images updated** - Regularly pull and deploy latest images
4. **Network isolation** - Use Docker networks to isolate containers
5. **Resource limits** - Set memory and CPU limits in production

```yaml
services:
  bookrequestarr:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

