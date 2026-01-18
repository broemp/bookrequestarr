# Scripts

This directory contains utility scripts for testing and maintenance.

## test-sabnzbd-polling.ts

Tests the SABnzbd status polling functionality.

**Usage:**

```bash
npm run test:sabnzbd
```

**What it does:**

1. Checks if SABnzbd is configured
2. Displays current SABnzbd queue
3. Displays recent SABnzbd history
4. Shows active downloads from the database
5. Runs a status update cycle
6. Shows updated download statuses

**Requirements:**

- SABnzbd must be configured (via settings or environment variables)
- Database must be initialized

**Example output:**

```
=== SABnzbd Status Polling Test ===

SABnzbd Configured: ✓

--- SABnzbd Queue ---
Queue items: 2
  1. Book.Title.2024.EPUB-GROUP
     Status: Downloading, Progress: 45%
     NZO ID: SABnzbd_nzo_abc123

--- Active Downloads (Database) ---
Active downloads: 2
  1. The Great Book
     Download ID: uuid-123
     NZO ID: SABnzbd_nzo_abc123
     Status: downloading
     Indexer: NZBGeek
     Confidence: 95%

--- Running Status Update ---
✓ Status update completed successfully

=== Test Complete ===
```

## Future Scripts

Additional utility scripts will be added here as needed for:
- Database maintenance
- Data migration
- Performance testing
- Bulk operations
