# Development Docker Setup Guide

This guide explains how to set up a complete development environment for Bookrequestarr using Docker Compose, including authentication (Authelia), download orchestration (Prowlarr + SABnzbd), and all supporting services.

## Overview

The development environment includes:

- **Bookrequestarr** - The main application
- **Authelia** - OIDC authentication provider
- **Redis** - Session storage for Authelia
- **Prowlarr** - Usenet/Torrent indexer aggregator
- **SABnzbd** - Usenet download client

All services run in Docker containers with persistent data stored in the `dev-data/` directory (gitignored).

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB of free disk space
- Ports 3000, 8080, 9091, and 9696 available

### Automated Setup

Run the setup script to create everything automatically:

```bash
./dev-setup.sh
```

This script will:
1. Create the `dev-data/` directory structure
2. Generate secure secrets for Authelia and JWT tokens
3. Configure Authelia with test users
4. Create a `.env` file from the template
5. Start all Docker containers

### Manual Setup

If you prefer to set up manually:

1. **Create directories:**
   ```bash
   mkdir -p dev-data/{app,authelia,redis,prowlarr,sabnzbd,downloads}
   ```

2. **Generate secrets:**
   ```bash
   # Generate secrets (save these for later)
   openssl rand -base64 48  # JWT_SECRET
   openssl rand -base64 48  # OIDC_CLIENT_SECRET
   ```

3. **Copy and configure .env:**
   ```bash
   cp env.dev.template .env
   # Edit .env and replace placeholders with generated secrets
   ```

4. **Configure Authelia:**
   ```bash
   cp dev-config/authelia/configuration.yml dev-data/authelia/configuration.yml
   # Edit dev-data/authelia/configuration.yml and replace placeholders
   ```

5. **Create Authelia users database:**
   Create `dev-data/authelia/users_database.yml` (see Users section below)

6. **Start containers:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

## Configuration

### Environment Variables

After running the setup script, edit `.env` to configure:

#### Required

- **`HARDCOVER_API_KEY`** - Get from [hardcover.app/settings/api](https://hardcover.app/settings/api)

#### Optional (configure after initial setup)

- **`PROWLARR_API_KEY`** - Get from Prowlarr Settings → General → Security
- **`SABNZBD_API_KEY`** - Get from SABnzbd Config → General → Security
- **`ANNAS_ARCHIVE_API_KEY`** - Get from [annas-archive.org/account](https://annas-archive.org/account)

### Test Users

The development environment includes two pre-configured test users:

| Username | Password  | Role  | Groups                                    |
|----------|-----------|-------|-------------------------------------------|
| `admin`  | `admin123`| Admin | `bookrequestarr`, `bookrequestarr_admin` |
| `user`   | `user123` | User  | `bookrequestarr`                          |

**Note:** These credentials are only for development and should NEVER be used in production.

### Authentication Modes

The `.env` file includes a `DISABLE_AUTH` variable:

- **`DISABLE_AUTH=false`** (default) - Full OIDC authentication via Authelia
- **`DISABLE_AUTH=true`** - Skip authentication, auto-login as admin (faster for development)

## Service Configuration

### 1. Bookrequestarr

**URL:** http://localhost:3000

The main application. No additional configuration needed after setting up the `.env` file.

### 2. Authelia

**URL:** http://localhost:9091

OIDC authentication provider. Pre-configured with:
- Test users (admin/user)
- OIDC client for Bookrequestarr
- Redis session storage
- File-based user backend

No additional configuration needed unless you want to add more users or modify settings.

#### Adding Users

Edit `dev-data/authelia/users_database.yml`:

```yaml
users:
  newuser:
    displayname: "New User"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."  # See below
    email: newuser@localhost
    groups:
      - bookrequestarr
```

Generate password hash:
```bash
docker compose -f docker-compose.dev.yml exec authelia authelia crypto hash generate argon2 --password 'yourpassword'
```

Restart Authelia:
```bash
docker compose -f docker-compose.dev.yml restart authelia
```

### 3. Prowlarr

**URL:** http://localhost:9696

Indexer aggregator for searching Usenet and torrent sites.

#### Initial Setup

1. Open http://localhost:9696
2. Complete the initial setup wizard
3. Go to **Settings → General → Security**
4. Copy the **API Key**
5. Add to `.env` as `PROWLARR_API_KEY`
6. Restart Bookrequestarr:
   ```bash
   docker compose -f docker-compose.dev.yml restart bookrequestarr
   ```

#### Adding Indexers

1. Go to **Indexers → Add Indexer**
2. Search for your preferred indexers (e.g., NZBgeek, DrunkenSlug)
3. Configure with your API keys
4. Test and save

**Recommended Categories:**
- Books (7000)
- Books/Ebook (7020)
- Books/Technical (7030)
- Audio/Audiobook (3030)

### 4. SABnzbd

**URL:** http://localhost:8080

Usenet download client.

#### Initial Setup

1. Open http://localhost:8080
2. Complete the **Quick-Start Wizard**:
   - Language: English
   - Add your Usenet server details (host, port, username, password)
   - Skip the rest (defaults are fine)
3. Go to **Config → General → Security**
4. Copy the **API Key**
5. Add to `.env` as `SABNZBD_API_KEY`
6. Go to **Config → Categories**
7. Add a new category named `books` (lowercase)
8. Restart Bookrequestarr:
   ```bash
   docker compose -f docker-compose.dev.yml restart bookrequestarr
   ```

#### Usenet Server

You'll need access to a Usenet server. Options include:
- **Free trials:** Eweka, UsenetServer (limited time)
- **Paid:** Newshosting, Easynews, Frugal Usenet
- **Test mode:** Skip Usenet setup and use Anna's Archive only

### 5. Redis

**Internal service** - No configuration needed. Used by Authelia for session storage.

## Testing the Full Workflow

### 1. Authentication Flow

1. Set `DISABLE_AUTH=false` in `.env`
2. Restart Bookrequestarr:
   ```bash
   docker compose -f docker-compose.dev.yml restart bookrequestarr
   ```
3. Open http://localhost:3000
4. You'll be redirected to Authelia login
5. Login with `admin` / `admin123`
6. You'll be redirected back to Bookrequestarr

### 2. Book Request Flow

1. Search for a book in Bookrequestarr
2. Request the book
3. As admin, go to **Requests** and approve the request
4. The download will be initiated automatically based on your `DOWNLOAD_SOURCE_PRIORITY`

### 3. Download Sources

#### Anna's Archive (Fast, No Setup Required)

1. Get an API key from [annas-archive.org/account](https://annas-archive.org/account)
2. Add to `.env` as `ANNAS_ARCHIVE_API_KEY`
3. Set `DOWNLOAD_SOURCE_PRIORITY=annas_archive_first` or `annas_archive_only`
4. Restart Bookrequestarr

#### Prowlarr + SABnzbd (Requires Usenet)

1. Complete Prowlarr and SABnzbd setup (see above)
2. Add API keys to `.env`
3. Set `DOWNLOAD_SOURCE_PRIORITY=prowlarr_first` or `prowlarr_only`
4. Restart Bookrequestarr

#### Hybrid (Recommended)

Use `DOWNLOAD_SOURCE_PRIORITY=prowlarr_first` to try Prowlarr first, then fallback to Anna's Archive if not found.

## Data Persistence

All data is stored in `dev-data/` (gitignored):

```
dev-data/
├── app/                    # Bookrequestarr database and downloads
│   ├── bookrequestarr.db
│   └── downloads/
├── authelia/               # Authelia configuration and database
│   ├── configuration.yml
│   ├── users_database.yml
│   └── db.sqlite3
├── redis/                  # Redis data
├── prowlarr/               # Prowlarr configuration
└── sabnzbd/                # SABnzbd configuration
```

### Backup

To backup your development data:
```bash
tar -czf dev-data-backup.tar.gz dev-data/
```

### Reset

To completely reset the environment:
```bash
docker compose -f docker-compose.dev.yml down -v
rm -rf dev-data/
./dev-setup.sh
```

## Useful Commands

### Docker Compose

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Stop all services
docker compose -f docker-compose.dev.yml down

# View logs (all services)
docker compose -f docker-compose.dev.yml logs -f

# View logs (specific service)
docker compose -f docker-compose.dev.yml logs -f bookrequestarr

# Restart a service
docker compose -f docker-compose.dev.yml restart bookrequestarr

# Rebuild and restart
docker compose -f docker-compose.dev.yml up -d --build bookrequestarr

# Stop and remove everything (including volumes)
docker compose -f docker-compose.dev.yml down -v
```

### Database

```bash
# Access Bookrequestarr database
sqlite3 dev-data/app/bookrequestarr.db

# Access Authelia database
sqlite3 dev-data/authelia/db.sqlite3
```

### Debugging

```bash
# Enter Bookrequestarr container
docker compose -f docker-compose.dev.yml exec bookrequestarr sh

# Check environment variables
docker compose -f docker-compose.dev.yml exec bookrequestarr env

# Check Authelia configuration
docker compose -f docker-compose.dev.yml exec authelia cat /config/configuration.yml
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
sudo lsof -i :3000  # or :8080, :9091, :9696

# Stop the conflicting service or change ports in docker-compose.dev.yml
```

### Authelia Login Not Working

1. Check Authelia logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs authelia
   ```

2. Verify users database exists:
   ```bash
   cat dev-data/authelia/users_database.yml
   ```

3. Restart Authelia:
   ```bash
   docker compose -f docker-compose.dev.yml restart authelia
   ```

### Prowlarr/SABnzbd Not Connecting

1. Verify API keys in `.env` are correct
2. Check container networking:
   ```bash
   docker compose -f docker-compose.dev.yml exec bookrequestarr ping prowlarr
   docker compose -f docker-compose.dev.yml exec bookrequestarr ping sabnzbd
   ```
3. Restart Bookrequestarr after updating `.env`

### Database Locked

SQLite databases can get locked if multiple processes access them:

```bash
# Stop all containers
docker compose -f docker-compose.dev.yml down

# Remove lock files
rm -f dev-data/app/*.db-shm dev-data/app/*.db-wal

# Start again
docker compose -f docker-compose.dev.yml up -d
```

### Downloads Not Working

1. Check download orchestrator logs in Bookrequestarr
2. Verify `DOWNLOAD_DIRECTORY` is writable
3. Check SABnzbd queue: http://localhost:8080/sabnzbd/queue
4. Verify Prowlarr indexers are working: http://localhost:9696/indexers

### Clean Slate

If everything is broken, start fresh:

```bash
# Stop and remove everything
docker compose -f docker-compose.dev.yml down -v

# Remove all data
rm -rf dev-data/

# Remove .env
rm .env

# Run setup again
./dev-setup.sh
```

## Network Architecture

All services communicate via Docker's internal network:

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ Bookrequestarr│◄───┤   Authelia   │                  │
│  │  :3000       │    │   :9091      │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                           │
│         │              ┌────▼─────┐                     │
│         │              │  Redis   │                     │
│         │              │  :6379   │                     │
│         │              └──────────┘                     │
│         │                                               │
│    ┌────▼─────┐      ┌──────────────┐                  │
│    │ Prowlarr │      │   SABnzbd    │                  │
│    │  :9696   │─────►│   :8080      │                  │
│    └──────────┘      └──────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
    localhost:3000  localhost:9091  localhost:9696
```

- **Internal communication** uses container names (e.g., `http://authelia:9091`)
- **External access** uses localhost (e.g., `http://localhost:3000`)

## Security Notes

### Development Only

This setup is **FOR DEVELOPMENT ONLY**. Do not use in production:

- Test users have weak passwords
- Secrets are stored in plain text
- No HTTPS/TLS encryption
- No rate limiting or brute force protection
- Permissive CORS and access policies

### Production Deployment

For production, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production Docker setup
- [CONFIGURATION.md](CONFIGURATION.md) - Production OIDC providers

## Additional Resources

- **Authelia Documentation:** https://www.authelia.com/
- **Prowlarr Documentation:** https://wiki.servarr.com/prowlarr
- **SABnzbd Documentation:** https://sabnzbd.org/wiki/
- **Docker Compose Documentation:** https://docs.docker.com/compose/

## Getting Help

If you encounter issues:

1. Check the logs: `docker compose -f docker-compose.dev.yml logs -f`
2. Review this troubleshooting guide
3. Check existing GitHub issues
4. Open a new issue with logs and configuration (redact secrets!)

## Contributing

When developing new features:

1. Use this dev environment for testing
2. Test both auth modes (`DISABLE_AUTH=true` and `false`)
3. Test with different download sources
4. Verify database migrations work
5. Check logs for errors

Happy developing! 🚀
