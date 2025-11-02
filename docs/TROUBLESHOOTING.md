# Troubleshooting Guide

## Database Issues

### Database File Cannot Be Created (Docker)

**Symptom:**
```
[ERROR] Failed to initialize database {"error":"unable to open database file"}
[ERROR] Critical: Database initialization failed on startup
```

**Cause:** The Docker volume mount doesn't have correct permissions for the `nodejs` user (UID 1001).

**Solutions:**

#### Option 1: Remove and Recreate the Volume (Easiest)

```bash
# Stop the container
docker compose down

# Remove the volume (WARNING: This deletes all data!)
docker volume rm bookrequestarr_bookrequestarr-data

# Start again - the volume will be recreated with correct permissions
docker compose up -d
```

#### Option 2: Fix Volume Permissions

```bash
# Stop the container
docker compose down

# Find the volume location
docker volume inspect bookrequestarr_bookrequestarr-data

# Fix permissions (replace <volume-path> with the actual path from above)
sudo chown -R 1001:1001 <volume-path>

# Or if using a bind mount, fix the host directory
sudo chown -R 1001:1001 ./data

# Start again
docker compose up -d
```

#### Option 3: Use Bind Mount with Pre-created Directory

Update your `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data  # Use bind mount instead of named volume
```

Then create the directory with correct permissions:

```bash
mkdir -p data
sudo chown -R 1001:1001 data
chmod -R 755 data
docker compose up -d
```

### Database Directory Not Writable

**Symptom:**
```
[ERROR] Database directory is not writable: /app/data
```

**Cause:** The application doesn't have write permissions to the database directory.

**Solution:**

For Docker:
```bash
# Fix permissions on the volume
docker compose down
sudo chown -R 1001:1001 ./data  # If using bind mount
# OR
docker volume rm bookrequestarr_bookrequestarr-data  # If using named volume
docker compose up -d
```

For local development:
```bash
# Fix permissions on the data directory
chmod 755 data/
```

### Database Locked Error

**Symptom:**
```
[ERROR] SQLITE_BUSY: database is locked
```

**Cause:** Another process is accessing the database, or a previous process didn't close properly.

**Solution:**

```bash
# Find processes using the database
lsof data/bookrequestarr.db

# Stop all instances
docker compose down

# If needed, remove the lock file
rm data/bookrequestarr.db-shm
rm data/bookrequestarr.db-wal

# Start again
docker compose up -d
```

### Migration Failed

**Symptom:**
```
[ERROR] Failed to run database migrations
[ERROR] SQLITE_ERROR: near "...": syntax error
```

**Cause:** Corrupted migration file or incompatible schema change.

**Solution:**

1. **Check migration files:**
   ```bash
   ls -la drizzle/*.sql
   cat drizzle/0000_*.sql  # Check for corruption
   ```

2. **Restore from backup:**
   ```bash
   # If you have a backup
   cp data/bookrequestarr.db.backup data/bookrequestarr.db
   ```

3. **Regenerate migrations (development only):**
   ```bash
   # Backup current database
   cp data/bookrequestarr.db data/bookrequestarr.db.backup
   
   # Remove corrupted migrations
   rm -rf drizzle/
   
   # Regenerate
   npm run db:generate
   
   # Test
   npm run dev
   ```

### Database Corruption

**Symptom:**
```
[ERROR] SQLITE_CORRUPT: database disk image is malformed
```

**Cause:** Disk corruption, improper shutdown, or hardware failure.

**Solution:**

1. **Restore from backup:**
   ```bash
   cp data/bookrequestarr.db.backup data/bookrequestarr.db
   ```

2. **Attempt recovery:**
   ```bash
   # Install sqlite3
   sudo apt-get install sqlite3  # Debian/Ubuntu
   # OR
   brew install sqlite3  # macOS
   
   # Attempt recovery
   sqlite3 data/bookrequestarr.db ".recover" | sqlite3 data/recovered.db
   
   # If successful, replace the corrupted database
   mv data/bookrequestarr.db data/bookrequestarr.db.corrupted
   mv data/recovered.db data/bookrequestarr.db
   ```

3. **Start fresh (last resort):**
   ```bash
   # Backup the corrupted database
   mv data/bookrequestarr.db data/bookrequestarr.db.corrupted
   
   # Start the application - it will create a new database
   docker compose up -d
   ```

## Authentication Issues

### Cannot Login with OIDC

**Symptom:** Redirect loop or "Unauthorized" error after OIDC login.

**Cause:** Incorrect OIDC configuration or missing group membership.

**Solution:**

1. **Check OIDC configuration:**
   ```bash
   # Verify environment variables
   docker compose exec bookrequestarr env | grep OIDC
   ```

2. **Verify group membership:**
   - User must be in `bookrequestarr` or `bookrequestarr_admin` group
   - Check your OIDC provider's user management

3. **Check JWT secret:**
   ```bash
   # Ensure JWT_SECRET is set and consistent
   echo $JWT_SECRET
   ```

4. **Enable debug logging:**
   ```yaml
   # In docker-compose.yml
   environment:
     - LOG_LEVEL=debug
   ```

### Development Mode Not Working

**Symptom:** Still prompted for OIDC login even with `DISABLE_AUTH=true`.

**Cause:** Environment variable not properly set or cached.

**Solution:**

```bash
# Verify the variable is set
docker compose exec bookrequestarr env | grep DISABLE_AUTH

# If not set, update docker-compose.yml:
environment:
  - DISABLE_AUTH=true

# Restart
docker compose down
docker compose up -d
```

## API Issues

### Hardcover API Errors

**Symptom:**
```
[ERROR] Hardcover API request failed
```

**Cause:** Invalid API key, rate limiting, or API downtime.

**Solution:**

1. **Verify API key:**
   ```bash
   docker compose exec bookrequestarr env | grep HARDCOVER_API_KEY
   ```

2. **Check API status:**
   - Visit https://hardcover.app/
   - Check their status page or social media

3. **Check rate limits:**
   - Review application logs for rate limit errors
   - Increase cache TTL to reduce API calls:
     ```yaml
     environment:
       - API_CACHE_TTL_DAYS=14  # Increase from default 7
     ```

### Search Not Working

**Symptom:** No results when searching for books.

**Cause:** API key issue, network connectivity, or API changes.

**Solution:**

1. **Check logs:**
   ```bash
   docker compose logs -f bookrequestarr | grep -i "hardcover\|search"
   ```

2. **Test API key manually:**
   ```bash
   curl -X POST https://api.hardcover.app/v1/graphql \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query":"{ books(where: {title: \"test\"}) { id title } }"}'
   ```

3. **Clear API cache:**
   ```bash
   # Connect to database
   docker compose exec bookrequestarr sh
   sqlite3 /app/data/bookrequestarr.db
   
   # Clear cache
   DELETE FROM api_cache;
   .exit
   ```

## Performance Issues

### Slow Startup

**Symptom:** Application takes a long time to start.

**Possible Causes:**
- Large database requiring migrations
- Network storage (slow I/O)
- Many pending migrations

**Solution:**

1. **Check startup logs:**
   ```bash
   docker compose logs bookrequestarr | grep -i "migration\|database"
   ```

2. **Use local storage:**
   - Ensure database is on local disk, not network storage
   - For Docker, use local volumes or bind mounts

3. **Optimize database:**
   ```bash
   # Connect to database
   sqlite3 data/bookrequestarr.db
   
   # Run optimization
   VACUUM;
   ANALYZE;
   .exit
   ```

### Slow Search

**Symptom:** Search takes a long time to return results.

**Cause:** API latency or cache misses.

**Solution:**

1. **Increase cache TTL:**
   ```yaml
   environment:
     - API_CACHE_TTL_DAYS=14
   ```

2. **Check network latency:**
   ```bash
   # Test API response time
   time curl -X POST https://api.hardcover.app/v1/graphql \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query":"{ books(limit: 10) { id title } }"}'
   ```

## Docker Issues

### Container Exits Immediately

**Symptom:** Container starts and immediately exits.

**Cause:** Configuration error or missing required environment variables.

**Solution:**

1. **Check logs:**
   ```bash
   docker compose logs bookrequestarr
   ```

2. **Verify required environment variables:**
   ```bash
   # Check .env file
   cat .env
   
   # Required variables:
   # - DATABASE_URL
   # - HARDCOVER_API_KEY
   # - JWT_SECRET (if auth enabled)
   # - OIDC_* variables (if auth enabled)
   ```

3. **Test configuration:**
   ```bash
   # Start in foreground to see errors
   docker compose up
   ```

### Health Check Failing

**Symptom:** Container marked as unhealthy.

**Cause:** Application not responding on port 3000.

**Solution:**

1. **Check application logs:**
   ```bash
   docker compose logs -f bookrequestarr
   ```

2. **Test health endpoint manually:**
   ```bash
   docker compose exec bookrequestarr wget -O- http://localhost:3000/health
   ```

3. **Verify port binding:**
   ```bash
   docker compose ps
   netstat -tulpn | grep 3000
   ```

### Volume Permission Issues

**Symptom:** Permission denied errors when accessing files.

**Cause:** Volume mounted with incorrect ownership.

**Solution:**

See "Database File Cannot Be Created" section above.

## Build Issues

### Build Fails with Native Module Error

**Symptom:**
```
Error: Cannot find module 'better-sqlite3'
```

**Cause:** Native module not built correctly for the target platform.

**Solution:**

```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install

# For Docker, rebuild without cache
docker compose build --no-cache
```

### TypeScript Errors

**Symptom:**
```
Error: Type 'X' is not assignable to type 'Y'
```

**Solution:**

```bash
# Run type checking
npm run check

# Fix errors in the code
# Then rebuild
npm run build
```

## General Debugging

### Enable Debug Logging

```yaml
# In docker-compose.yml
environment:
  - LOG_LEVEL=debug
```

### View Real-time Logs

```bash
# All logs
docker compose logs -f

# Just application logs
docker compose logs -f bookrequestarr

# Filter for specific terms
docker compose logs -f bookrequestarr | grep -i "error\|warn"
```

### Access Container Shell

```bash
# Access running container
docker compose exec bookrequestarr sh

# Check files
ls -la /app/data/

# Check environment
env | grep -E "DATABASE|HARDCOVER|OIDC"

# Test database connection
sqlite3 /app/data/bookrequestarr.db ".tables"
```

### Check Resource Usage

```bash
# Container stats
docker stats bookrequestarr

# Disk usage
docker system df

# Volume size
docker volume inspect bookrequestarr_bookrequestarr-data
```

## Getting Help

If you're still experiencing issues:

1. **Check existing issues:** https://github.com/broemp/bookrequestarr/issues
2. **Gather information:**
   - Application logs: `docker compose logs bookrequestarr > logs.txt`
   - Environment (redact secrets): `docker compose config > config.txt`
   - System info: `docker version`, `docker compose version`
3. **Create a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Logs and configuration (redact secrets!)
   - System information

## Common Mistakes

### ❌ Using `docker-compose` (deprecated)
```bash
docker-compose up  # OLD, deprecated
```

### ✅ Use `docker compose` (new)
```bash
docker compose up  # NEW, correct
```

### ❌ Forgetting to set required environment variables
```bash
docker compose up  # Missing HARDCOVER_API_KEY
```

### ✅ Always use .env file or environment variables
```bash
cp .env.example .env
# Edit .env with your values
docker compose up
```

### ❌ Running as root in production
```yaml
user: root  # DON'T DO THIS
```

### ✅ Use the default nodejs user
```yaml
# No user override needed - Dockerfile sets it correctly
```

### ❌ Using `DISABLE_AUTH=true` in production
```yaml
environment:
  - DISABLE_AUTH=true  # NEVER IN PRODUCTION!
```

### ✅ Always use OIDC in production
```yaml
environment:
  - OIDC_ISSUER=https://your-provider.com
  - OIDC_CLIENT_ID=your_client_id
  # etc.
```

