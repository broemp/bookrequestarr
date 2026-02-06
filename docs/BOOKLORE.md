# Booklore Integration Guide

## Overview

Booklore is a self-hosted digital library management system that automatically organizes and manages your ebook collection. Bookrequestarr integrates with Booklore via its **BookDrop** folder feature, which allows automatic import of downloaded books into your library.

**What You Get:**
- ✅ Automatic library ingestion after downloads complete
- ✅ No manual file management required
- ✅ Seamless integration between request approval and library availability
- ✅ Optional API health checks for monitoring

**Links:**
- **Booklore Repository:** https://github.com/booklore-app/booklore
- **Booklore Documentation:** https://booklore-app.github.io/booklore/
- **Latest Release:** https://github.com/booklore-app/booklore/releases

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Booklore](#installing-booklore)
3. [Configuring Bookrequestarr](#configuring-bookrequestarr)
4. [Docker Setup](#docker-setup)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Advanced Topics](#advanced-topics)

---

## Prerequisites

### System Requirements

- **Booklore:** v1.18.5 or later (actively maintained as of Jan 2026)
- **Disk Space:** Sufficient space for both download directory and library
- **Permissions:** Write access to Booklore's BookDrop folder

### Before You Begin

1. Install and configure Bookrequestarr
2. Verify downloads are working (Anna's Archive or Prowlarr/SABnzbd)
3. Have a plan for library organization (Booklore handles this automatically)

---

## Installing Booklore

### Option 1: Docker (Recommended)

```bash
docker run -d \
  --name booklore \
  -p 3001:3001 \
  -v ./booklore-data:/data \
  -v ./booklore-library:/library \
  -v ./booklore-bookdrop:/bookdrop \
  -e NODE_ENV=production \
  ghcr.io/booklore-app/booklore:latest
```

**Important Volume Mounts:**
- `/data` - Database and configuration
- `/library` - Your organized book collection
- `/bookdrop` - Drop folder for automatic imports

### Option 2: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/booklore-app/booklore.git
cd booklore
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Start Booklore:
```bash
npm start
```

### Verify Installation

1. Access Booklore at `http://localhost:3001`
2. Complete initial setup wizard
3. Note the BookDrop folder path (Settings → Import → BookDrop Folder)

---

## Configuring Bookrequestarr

### Step 1: Identify BookDrop Folder

In Booklore:
1. Navigate to **Settings** → **Import**
2. Find the **BookDrop Folder** path
3. Example: `/var/lib/booklore/bookdrop` or `/library/bookdrop`

### Step 2: Configure via Admin UI

1. Log into Bookrequestarr as admin
2. Go to **Admin** → **Settings**
3. Scroll to **Booklore Integration** section
4. Fill in:
   - ☑️ **Enable Booklore Integration**: Check this box
   - **BookDrop Folder Path**: Enter the full path from Step 1
   - **Booklore Base URL** (optional): `http://localhost:3001` or your Booklore URL
   - **Booklore API Key** (optional): If Booklore requires authentication
   - ☐ **Verify imports via API** (optional): Check to enable API verification
5. Click **Save Settings**
6. Click **Test Connection** to verify

### Step 3: Configure via Environment Variables

Alternatively, set in `.env`:

```bash
# Enable Booklore integration
BOOKLORE_ENABLED=true

# Path to Booklore's BookDrop folder (REQUIRED)
BOOKLORE_BOOKDROP_PATH=/var/lib/booklore/bookdrop

# Booklore API URL (optional, for health checks)
BOOKLORE_BASE_URL=http://localhost:3001

# Booklore API key (optional, if authentication is required)
# BOOKLORE_API_KEY=your-api-key-here

# Verify imports via API (optional)
BOOKLORE_VERIFY_IMPORTS=false
```

---

## Docker Setup

### Docker Compose Example

```yaml
version: '3.8'

services:
  bookrequestarr:
    image: ghcr.io/yourusername/bookrequestarr:latest
    container_name: bookrequestarr
    ports:
      - '3000:3000'
    environment:
      - BOOKLORE_ENABLED=true
      - BOOKLORE_BOOKDROP_PATH=/bookdrop
      - BOOKLORE_BASE_URL=http://booklore:3001
    volumes:
      - ./bookrequestarr-data:/app/data
      - ./downloads:/app/downloads
      - booklore-bookdrop:/bookdrop  # Shared volume with Booklore
    networks:
      - library-network

  booklore:
    image: ghcr.io/booklore-app/booklore:latest
    container_name: booklore
    ports:
      - '3001:3001'
    volumes:
      - ./booklore-data:/data
      - ./booklore-library:/library
      - booklore-bookdrop:/bookdrop  # Shared volume with Bookrequestarr
    networks:
      - library-network

volumes:
  booklore-bookdrop:  # Named volume shared between containers

networks:
  library-network:
    driver: bridge
```

### Key Configuration Points

1. **Shared Volume:**
   - Use a named volume (`booklore-bookdrop`) or bind mount to share the BookDrop folder
   - Both containers must mount this volume to the same path

2. **Network:**
   - Place both containers on the same network for API health checks
   - Use container name (`http://booklore:3001`) in `BOOKLORE_BASE_URL`

3. **Permissions:**
   - Ensure both containers have matching user IDs (PUID/PGID) for file permissions
   - Or use a shared group with group write permissions

---

## Testing the Integration

### Manual Test

1. Download a book manually in Bookrequestarr:
   - Navigate to **Search** → search for a book → **Request**
   - Go to **Admin** → **Requests** → **Approve** the request
   - Click **Download** to trigger manual download

2. Check Bookrequestarr logs:
```bash
# Docker
docker logs bookrequestarr -f | grep -i booklore

# PM2
pm2 logs bookrequestarr | grep -i booklore
```

Expected log output:
```
Successfully copied file to Booklore BookDrop { fileName: 'book.epub', destPath: '/bookdrop/book.epub' }
```

3. Verify in BookDrop folder:
```bash
ls -la /path/to/booklore/bookdrop
```

Should see the downloaded book file.

4. Check Booklore:
   - Access Booklore UI
   - Navigate to **Library**
   - The book should appear shortly (Booklore scans BookDrop every few minutes)

### Connection Test

Use the **Test Connection** button in Admin Settings:

**Success:**
```
✓ BookDrop OK
```

**Failure Examples:**
```
✗ BookDrop path not configured
✗ BookDrop path is not a directory
✗ BookDrop path exists but is not writable. Check permissions.
```

---

## Troubleshooting

### Issue #1: "BookDrop path not configured"

**Symptoms:**
- Test connection fails with this error
- No files appear in BookDrop folder

**Solutions:**
- Verify `BOOKLORE_BOOKDROP_PATH` is set (environment variable or admin settings)
- Check spelling and path accuracy
- Ensure path includes `/bookdrop` at the end

### Issue #2: "BookDrop path is not a directory"

**Symptoms:**
- Path exists but test fails
- Files not being copied

**Solutions:**
- Verify the path points to a directory, not a file
- Check that Booklore has created the BookDrop folder
- If using Docker, verify volume mounts are correct

### Issue #3: "BookDrop path exists but is not writable"

**Symptoms:**
- Test connection shows permission error
- Logs show "Failed to copy file to Booklore BookDrop"

**Solutions:**

**For Host Installation:**
```bash
# Check current permissions
ls -ld /path/to/booklore/bookdrop

# Fix permissions (option 1: give write to all)
chmod 777 /path/to/booklore/bookdrop

# Fix permissions (option 2: give write to specific user)
sudo chown bookrequestarr:bookrequestarr /path/to/booklore/bookdrop
chmod 775 /path/to/booklore/bookdrop
```

**For Docker:**
```bash
# Check container user IDs
docker exec bookrequestarr id
docker exec booklore id

# If mismatched, update docker-compose.yml:
services:
  bookrequestarr:
    user: "1000:1000"  # Match Booklore's UID:GID
    # ... rest of config

  booklore:
    user: "1000:1000"
    # ... rest of config
```

### Issue #4: Files not appearing in Booklore Library

**Symptoms:**
- Files successfully copy to BookDrop
- Books never appear in Booklore library

**Solutions:**

1. Check Booklore import settings:
   - Go to Booklore Settings → Import
   - Verify **BookDrop Folder** is enabled
   - Check **Scan Interval** (default: every 5 minutes)

2. Manually trigger import:
   - In Booklore, go to Settings → Import → BookDrop
   - Click **Scan Now**

3. Check Booklore logs for import errors:
```bash
docker logs booklore -f | grep -i import
```

4. Verify file format:
   - Booklore supports: EPUB, PDF, MOBI, AZW3
   - Unsupported formats will be ignored

5. Check file corruption:
   - Ensure downloaded file is valid (try opening it)
   - Re-download if corrupted

### Issue #5: "Failed to copy file to Booklore BookDrop"

**Symptoms:**
- Download completes successfully
- Log shows copy failure
- File remains only in downloads directory

**Solutions:**

1. Verify disk space:
```bash
df -h /path/to/booklore/bookdrop
```

2. Check file system permissions:
```bash
# Test write access manually
touch /path/to/booklore/bookdrop/test.txt
rm /path/to/booklore/bookdrop/test.txt
```

3. If Docker, verify volume mounts:
```bash
docker inspect bookrequestarr | grep -A 10 Mounts
docker inspect booklore | grep -A 10 Mounts
```

Ensure both containers mount the same underlying directory.

### Issue #6: API Health Check Fails

**Symptoms:**
- Test connection shows "API health check failed"
- Integration still works (files copy successfully)

**Note:** API health check is optional. If BookDrop folder is working, you can ignore API errors.

**Solutions:**

1. Verify Booklore is running:
```bash
curl http://localhost:3001/api/v1/healthcheck
```

2. Check network connectivity:
   - If Docker: ensure containers are on same network
   - If different hosts: check firewall rules

3. Verify API key (if required):
   - Some Booklore configurations require authentication
   - Check Booklore settings for API key requirements

---

## Best Practices

### File Management

1. **Keep Downloads Separate:**
   - Don't set BookDrop as your download directory
   - Files are copied (not moved) to BookDrop
   - Allows for backup/re-processing if needed

2. **Regular Cleanup:**
   - Booklore auto-imports from BookDrop
   - Imported files can be deleted from BookDrop
   - Set up a cron job to clean up old files:
```bash
# Clean files older than 7 days from BookDrop
find /path/to/booklore/bookdrop -type f -mtime +7 -delete
```

3. **Monitor Disk Space:**
   - Books are duplicated (downloads + library)
   - Plan for ~2x disk space usage
   - Consider moving downloads to separate volume

### Performance

1. **BookDrop Scan Interval:**
   - Default: 5 minutes
   - Adjust in Booklore settings if needed
   - Lower = faster imports, higher CPU usage

2. **Concurrent Downloads:**
   - Booklore can handle multiple simultaneous imports
   - No need to throttle Bookrequestarr downloads

### Security

1. **Access Control:**
   - Restrict BookDrop folder permissions (755 or 775)
   - Don't expose BookDrop via web server
   - Keep API keys secure (don't commit to version control)

2. **Docker Isolation:**
   - Use named volumes instead of bind mounts for sensitive data
   - Run containers as non-root user
   - Limit network exposure (only expose necessary ports)

---

## Advanced Topics

### Custom BookDrop Logic

If you need custom processing before Booklore import, modify `src/lib/server/booklore.ts`:

```typescript
export async function copyToBookdrop(filePath: string): Promise<boolean> {
  // ... existing code ...

  // Custom logic: Rename files with metadata
  const metadata = await extractMetadata(filePath);
  const customFileName = `${metadata.author} - ${metadata.title}.${fileExt}`;
  const destPath = path.join(config.bookdropPath, customFileName);

  await fs.copyFile(filePath, destPath);

  // ... rest of code ...
}
```

### Import Verification

Enable API verification to confirm successful imports:

1. Set `BOOKLORE_VERIFY_IMPORTS=true`
2. Configure `BOOKLORE_BASE_URL` and `BOOKLORE_API_KEY`
3. Bookrequestarr will poll Booklore API to verify import

**Note:** Current implementation logs verification request but does not yet poll for completion. Future enhancement.

### Multiple Booklore Instances

To use multiple Booklore instances (e.g., separate libraries for different genres):

1. Run multiple Booklore containers with different BookDrop folders
2. Configure Bookrequestarr to use a primary BookDrop path
3. Use post-processing scripts to route books to appropriate library

### Booklore API Integration (Future)

Potential future enhancements:

- **Direct API Upload:** Upload books via Booklore API instead of BookDrop
- **Metadata Sync:** Update book metadata in Booklore from Hardcover
- **Reading Progress:** Link reading progress from Booklore to Bookrequestarr dashboard
- **Library Search:** Search Booklore library from Bookrequestarr to prevent duplicate requests

---

## Monitoring

### Logs to Watch

**Bookrequestarr:**
```bash
# Success
Successfully copied file to Booklore BookDrop

# Failure
Failed to copy file to Booklore BookDrop

# Info
Booklore integration disabled, skipping BookDrop copy
```

**Booklore:**
```bash
# Import started
Starting BookDrop import scan

# File detected
Found new file in BookDrop: book.epub

# Import complete
Successfully imported: book.epub
```

### Health Checks

**Automated Monitoring:**
```bash
# Check if BookDrop is accessible
curl -f http://localhost:3000/api/booklore/test || echo "Booklore integration down"

# Monitor BookDrop folder size
du -sh /path/to/booklore/bookdrop
```

**Alerts:**
- Set up alerts if BookDrop folder exceeds certain size (indicates import failures)
- Monitor Bookrequestarr logs for repeated copy failures
- Track library growth in Booklore to ensure imports are working

---

## FAQ

### Q: Do I need Booklore API key?

**A:** No, API key is optional. The primary integration works via the BookDrop folder, which doesn't require API access. API key is only needed for health checks and future verification features.

### Q: What happens if Booklore is down?

**A:** Downloads continue normally in Bookrequestarr. Files are copied to BookDrop (if the folder is accessible), and Booklore will import them when it comes back online.

### Q: Can I use this with Calibre instead?

**A:** Bookrequestarr also supports Calibre-Web Automated integration. See `CONFIGURATION.md` for details. You can enable both integrations simultaneously.

### Q: Will this delete my downloads?

**A:** No, files are copied (not moved) to BookDrop. Your original downloads remain in the download directory.

### Q: How do I know if a book was successfully imported?

**A:** Check the Booklore library UI. If verification is enabled, Bookrequestarr will log verification attempts (full implementation pending).

### Q: Can I customize file naming?

**A:** Yes, modify the `copyToBookdrop` function in `src/lib/server/booklore.ts`. See "Advanced Topics" for examples.

### Q: What if BookDrop and download directories are on different disks?

**A:** Copying across file systems is supported but slower. Ensure both disks have sufficient speed and space.

---

## Uninstalling

To disable Booklore integration:

1. **Via Admin UI:**
   - Uncheck "Enable Booklore Integration"
   - Save settings

2. **Via Environment:**
   - Set `BOOKLORE_ENABLED=false` (or remove the variable)
   - Restart Bookrequestarr

3. **Clean Up:**
   - Files already in BookDrop will remain
   - Stop Booklore container if no longer needed
   - Remove Booklore data volumes if permanently uninstalling

---

## Additional Resources

- **Booklore GitHub:** https://github.com/booklore-app/booklore
- **Booklore Documentation:** https://booklore-app.github.io/booklore/
- **Bookrequestarr GitHub:** https://github.com/yourusername/bookrequestarr
- **Docker Hub:** https://hub.docker.com/r/booklore/booklore

---

## Support

For Booklore integration issues:

1. Check [Troubleshooting](#troubleshooting) section above
2. Verify Booklore is properly installed and running
3. Test BookDrop folder manually (copy a file there)
4. Review Bookrequestarr logs for error messages
5. Open an issue on [Bookrequestarr GitHub](https://github.com/yourusername/bookrequestarr/issues)

**When reporting issues, include:**
- Bookrequestarr version
- Booklore version
- BookDrop folder path (sanitized)
- Relevant log excerpts (sanitize paths/keys)
- Docker Compose config (if applicable, sanitized)
