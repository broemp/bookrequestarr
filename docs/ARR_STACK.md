# Arr Stack Integration Guide

## Overview

Bookrequestarr integrates with the *arr ecosystem (Prowlarr + SABnzbd) to enable automated Usenet-based book downloads. This provides an alternative to direct downloads from Anna's Archive, especially useful for books not available for fast download or when you prefer Usenet sources.

**Architecture:**
- **Prowlarr**: Indexer aggregator that searches across configured Usenet indexers
- **SABnzbd**: Usenet download client that manages the download queue
- **Result Matcher**: Intelligent scoring system to ensure download quality
- **Download Orchestrator**: Coordinates multi-source downloads with fallback logic

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [Configuration](#configuration)
4. [Confidence Scoring](#confidence-scoring)
5. [Download Workflow](#download-workflow)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Topics](#advanced-topics)

---

## How It Works

### Request Flow

```
User creates book request
        ↓
Admin approves request
        ↓
Download orchestrator triggered (if auto-download enabled)
        ↓
    ┌───────────────┐
    │ Anna's Archive│ (Priority 1)
    └───────┬───────┘
            │ (if fails or not configured)
            ↓
    ┌───────────────┐
    │   Prowlarr    │ (Priority 2)
    └───────┬───────┘
            │
            ↓
    Search indexers for NZB
            │
            ↓
    Result Matcher scores results
            │
            ↓
    ┌────────────────┐
    │ High confidence?│
    └────────┬───────┘
         Yes │
            ↓
    ┌───────────────┐
    │   SABnzbd     │
    └───────┬───────┘
            │
            ↓
    Download to temp → Move to final location
            │
            ↓
    Request marked as "completed"
```

### Status Polling

Bookrequestarr polls SABnzbd every **30 seconds** (configured in `hooks.server.ts`) to update download statuses:
- `queued` → `downloading` → `completed`
- Failed downloads trigger fallback or mark request as `download_problem`

---

## Prerequisites

### Required Software

1. **Prowlarr**
   - Version: Latest stable (v1.x recommended)
   - Installation: [Prowlarr Wiki](https://wiki.servarr.com/prowlarr)
   - Docker: `lscr.io/linuxserver/prowlarr:latest`

2. **SABnzbd**
   - Version: Latest stable (v4.x recommended)
   - Installation: [SABnzbd Documentation](https://sabnzbd.org/wiki/installation)
   - Docker: `lscr.io/linuxserver/sabnzbd:latest`

3. **Usenet Provider**
   - Subscription to at least one Usenet provider (e.g., Newshosting, Frugal Usenet, UsenetServer)
   - Sufficient retention period (recommend 3000+ days for older books)

4. **Usenet Indexers**
   - At least one indexer configured in Prowlarr
   - Recommended for books:
     - **NZBgeek** (general, good book coverage)
     - **DrunkenSlug** (general, free tier available)
     - **NZBFinder** (large library)
     - **abNZB** (book-focused)

### Network Requirements

- Prowlarr, SABnzbd, and Bookrequestarr must be able to communicate over HTTP
- If using Docker: ensure containers are on the same network or can reach each other
- Firewall rules: allow traffic on configured ports (default: 9696 for Prowlarr, 8080 for SABnzbd)

---

## Configuration

### Step 1: Configure Prowlarr

1. **Access Prowlarr** at `http://your-server:9696`

2. **Add Indexers:**
   - Navigate to **Indexers** → **Add Indexer**
   - Search for your indexer (e.g., "NZBgeek")
   - Enter API key or credentials
   - Test connectivity
   - Save

   Recommend adding 3-5 indexers for best coverage.

3. **Get API Key:**
   - Go to **Settings** → **General** → **Security**
   - Copy the **API Key**

4. **Add Bookrequestarr as Application (Optional but Recommended):**
   - Go to **Settings** → **Apps** → **Add Application**
   - Select **Custom** or **Other**
   - Configure sync if desired (not required for basic operation)

### Step 2: Configure SABnzbd

1. **Access SABnzbd** at `http://your-server:8080`

2. **Complete Initial Setup Wizard:**
   - Add your Usenet provider(s)
   - Configure download directories
   - Set language (if needed)

3. **Create "books" Category:**
   - Go to **Config** → **Categories**
   - Click **+** to add new category
   - Name: `books`
   - Folder: `books` (or custom path)
   - **Important:** Set **Processing** to "None" or minimal (Bookrequestarr handles file management)
   - Save

4. **Get API Key:**
   - Go to **Config** → **General** → **Security**
   - Copy the **API Key** (or generate one if empty)
   - **NZB Key** can be left as-is (not used by Bookrequestarr)

### Step 3: Configure Bookrequestarr

#### Option A: Environment Variables (Recommended for Docker)

Add to `.env` file:

```bash
PROWLARR_URL=http://prowlarr:9696
PROWLARR_API_KEY=your_prowlarr_api_key_here

SABNZBD_URL=http://sabnzbd:8080
SABNZBD_API_KEY=your_sabnzbd_api_key_here
SABNZBD_CATEGORY=books
```

**Note:** If running in Docker Compose, use service names as hostnames (e.g., `http://prowlarr:9696`). If running on host, use `http://localhost:9696`.

#### Option B: Admin Settings UI

1. Navigate to **Admin** → **Settings** in Bookrequestarr
2. Scroll to **Download Configuration** section
3. Fill in:
   - **Prowlarr URL**: Full URL including protocol (e.g., `http://localhost:9696`)
   - **Prowlarr API Key**: API key from Prowlarr
   - **SABnzbd URL**: Full URL including protocol (e.g., `http://localhost:8080`)
   - **SABnzbd API Key**: API key from SABnzbd
   - **SABnzbd Category**: `books` (must match category created in Step 2)
4. Click **Test Connection** buttons to verify
5. Save settings

#### Test Connection

After configuration, test the integration:

```bash
# Via Admin UI: Use "Test Connection" buttons

# Via API (requires authentication):
curl -X POST http://localhost:3000/api/prowlarr/test
curl -X POST http://localhost:3000/api/sabnzbd/test
```

Expected response:
```json
{
  "success": true,
  "version": "1.x.x"
}
```

### Step 4: Enable Auto-Download (Optional)

To automatically download approved requests:

1. Go to **Admin** → **Settings**
2. Find **Download Auto Mode**
3. Select:
   - **Disabled**: Manual download triggering only
   - **Anna's Archive only**: Only try Anna's Archive
   - **Prowlarr only**: Only try Prowlarr/SABnzbd
   - **Anna's Archive, fallback to Prowlarr**: Try Anna's Archive first, use Prowlarr if it fails (Recommended)
   - **Prowlarr, fallback to Anna's Archive**: Try Prowlarr first, use Anna's Archive if it fails

---

## Confidence Scoring

### How It Works

When Prowlarr returns search results, Bookrequestarr scores each result based on metadata matching. This prevents downloading incorrect editions or entirely different books.

### Scoring Breakdown

| Criteria | Weight | Matching Logic |
|----------|--------|----------------|
| **ISBN** | 50% | Exact match (ISBN-10 or ISBN-13) |
| **Title** | 25% | Levenshtein distance similarity (0-100%) |
| **Author** | 15% | Levenshtein distance similarity (0-100%) |
| **Year** | 5% | Exact match or within ±2 years |
| **Language** | 5% | Exact match (if specified in request) |

**Total Score:** 0-100

### Confidence Levels

| Level | Score Range | Behavior |
|-------|-------------|----------|
| **High** | 80-100 | Auto-download enabled, no warnings |
| **Medium** | 50-79 | Download proceeds with warning, logged for review |
| **Low** | 0-49 | Result skipped, fallback attempted |

### Example Scoring

**Request:**
- Title: "The Hobbit"
- Author: "J.R.R. Tolkien"
- ISBN-13: 9780547928227
- Year: 2012

**Search Result:**
- Title: "The Hobbit: 75th Anniversary Edition"
- Author: "J. R. R. Tolkien"
- ISBN-13: 9780547928227
- Year: 2012

**Score Breakdown:**
- ISBN: 50/50 (exact match)
- Title: 23/25 (95% similarity, subtitle is acceptable)
- Author: 14/15 (95% similarity, initials vs full middle names)
- Year: 5/5 (exact match)
- Language: 5/5 (both English)

**Final Score:** 97/100 → **High Confidence** ✅

---

## Download Workflow

### Initiating a Download

#### Manual Trigger

1. Go to **Admin** → **Requests**
2. Find the approved request
3. Click **Download** button
4. Select source (if prompted):
   - Anna's Archive
   - Prowlarr/SABnzbd

#### Automatic Trigger

When auto-download is enabled:
- Request status changes from `pending` → `approved`
- Download orchestrator automatically initiates download based on configured mode

### Download States

| State | Description | Next Steps |
|-------|-------------|------------|
| `pending` | Download record created, not started | Prowlarr search triggered |
| `searching` | Searching indexers via Prowlarr | Awaiting results |
| `found` | NZB found, sending to SABnzbd | SABnzbd queuing |
| `queued` | In SABnzbd queue | Awaiting download start |
| `downloading` | Actively downloading from Usenet | Monitor progress in SABnzbd |
| `post_processing` | SABnzbd post-processing (rare for books) | Finalizing |
| `completed` | Downloaded and moved to final location | Request status → `completed` |
| `failed` | Download failed (bad NZB, incomplete, etc.) | Retry or fallback triggered |
| `cancelled` | User or system cancelled | No further action |

### File Handling

1. **Download to Temp Directory:**
   - SABnzbd downloads to its configured incomplete directory
   - On completion, SABnzbd moves to `DOWNLOAD_TEMP_DIRECTORY` (configurable)

2. **Move to Final Directory:**
   - Bookrequestarr verifies file integrity
   - Moves file from temp → `DOWNLOAD_DIRECTORY`
   - Updates database with final file path

3. **Naming Convention:**
   - Files keep their original names from NZB
   - Future enhancement: configurable naming templates

---

## Troubleshooting

### Common Issues

#### 1. "Prowlarr connection failed"

**Symptoms:**
- Test connection button shows error
- Downloads never start

**Solutions:**
- Verify Prowlarr URL is correct (include `http://` or `https://`)
- Check Prowlarr API key is valid (Settings → General → Security)
- Ensure Prowlarr is running and accessible from Bookrequestarr server
- Check firewall rules allow traffic on port 9696
- If using Docker: verify containers are on same network or can communicate

**Test manually:**
```bash
curl -H "X-Api-Key: YOUR_API_KEY" http://prowlarr:9696/api/v1/indexer
```

Expected: JSON array of indexers

#### 2. "SABnzbd connection failed"

**Symptoms:**
- Test connection button shows error
- Downloads stuck in `queued` state

**Solutions:**
- Verify SABnzbd URL is correct
- Check SABnzbd API key is valid (Config → General → Security)
- Ensure SABnzbd is running
- Verify SABnzbd category exists (default: `books`)
- Check SABnzbd has at least one Usenet provider configured

**Test manually:**
```bash
curl "http://sabnzbd:8080/api?mode=version&apikey=YOUR_API_KEY&output=json"
```

Expected: `{"version": "x.x.x"}`

#### 3. "No results found"

**Symptoms:**
- Prowlarr search returns 0 results
- All requests fail with "no results"

**Solutions:**
- Verify Prowlarr has indexers configured and enabled
- Check indexers are healthy (Prowlarr → Indexers → Test)
- Search manually in Prowlarr for the same book to verify coverage
- Try different search terms (some indexers prefer author first, others title first)
- Add more indexers for better coverage
- Check book metadata:
  - Is ISBN correct?
  - Is title exact (avoid special characters if possible)
  - Is author name in common format?

#### 4. "Low confidence score, skipping result"

**Symptoms:**
- Download logs show results found but skipped
- Request ends with `download_problem` status

**Solutions:**
- Review confidence score breakdown in logs
- Check book metadata accuracy:
  - ISBN may be incorrect (verify against Hardcover or Google Books)
  - Title may have special characters or formatting issues
  - Author name may differ from search results (e.g., "Tolkien" vs "J.R.R. Tolkien")
- Manually review search results in Prowlarr to see actual metadata
- Consider adjusting confidence thresholds (future enhancement)

#### 5. "Download stuck in 'downloading' state"

**Symptoms:**
- SABnzbd shows download progressing but Bookrequestarr doesn't update
- Download completes in SABnzbd but status doesn't change

**Solutions:**
- Check SABnzbd category matches configured category
- Verify download directory permissions (Bookrequestarr must have write access)
- Check SABnzbd post-processing settings (should be minimal/none for books)
- Review SABnzbd logs for errors
- Verify status polling is running (check `hooks.server.ts` background job)

**Force status check:**
Restart Bookrequestarr to trigger immediate status poll.

#### 6. "File not found after download"

**Symptoms:**
- SABnzbd shows "completed"
- Bookrequestarr can't find file to move

**Solutions:**
- Check SABnzbd download directory configuration
- Verify `DOWNLOAD_TEMP_DIRECTORY` matches SABnzbd's category folder
- Ensure Bookrequestarr has read permissions on SABnzbd download directory
- If using Docker: verify volume mounts are shared between containers

**Example Docker volume sharing:**
```yaml
services:
  bookrequestarr:
    volumes:
      - ./downloads:/app/downloads
  sabnzbd:
    volumes:
      - ./downloads:/downloads
```

---

## Advanced Topics

### Custom Search Queries

Prowlarr searches use the following query format:

```
<author> <title>
```

Example: `J.R.R. Tolkien The Hobbit`

**Customization (Future):**
- Configurable query templates
- Support for advanced Prowlarr search parameters (category, year range, etc.)

### Download Priority

When multiple sources are configured, download orchestrator uses this priority:

1. **Anna's Archive** (if configured and enabled)
   - Fastest for most books
   - No Usenet subscription required
   - Limited by available fast download slots

2. **Prowlarr/SABnzbd** (fallback or primary)
   - Requires Usenet subscription
   - Better for rare/older books
   - Dependent on indexer coverage

**Fallback Logic:**
- If primary source fails, next source is tried automatically
- Maximum 2 retry attempts per source
- After all sources exhausted, request marked as `download_problem`

### Monitoring and Logging

All download operations are logged with structured logging:

```typescript
logger.info('Prowlarr search completed', {
  requestId: 'abc123',
  resultsFound: 5,
  bestScore: 95
});
```

**Log Levels:**
- `debug`: Detailed API requests/responses, score breakdowns
- `info`: Download state changes, search results
- `warn`: Low confidence scores, retry attempts
- `error`: API failures, download errors

**Viewing Logs:**
```bash
# Docker
docker logs bookrequestarr -f

# PM2
pm2 logs bookrequestarr

# Direct
npm run dev  # logs to console
```

### Performance Tuning

#### Polling Interval

SABnzbd status polling runs every 30 seconds by default.

**Adjust in `src/hooks.server.ts`:**
```typescript
const POLLING_INTERVAL = 30000; // milliseconds
```

**Recommendations:**
- Faster polling (10-20s): Real-time status updates, higher server load
- Slower polling (60s+): Lower server load, delayed status updates

#### Concurrent Downloads

Currently, Bookrequestarr processes downloads sequentially per request.

**Future Enhancement:**
- Configure max concurrent downloads
- Queue management for high-volume setups

#### Indexer Timeout

Prowlarr search timeout: **30 seconds** (hard-coded in Prowlarr)

If indexers are slow, consider:
- Disabling slow/unreliable indexers
- Using indexer priority settings in Prowlarr
- Increasing Prowlarr's internal timeout (if supported)

---

## Best Practices

1. **Use Multiple Indexers:**
   - Aim for 3-5 indexers for best coverage
   - Mix free and paid indexers
   - Include at least one book-focused indexer

2. **Monitor Confidence Scores:**
   - Review logs for patterns in low-confidence results
   - Adjust book metadata if scores are consistently low
   - Report issues with scoring logic to maintainers

3. **Test Before Enabling Auto-Download:**
   - Manually test 5-10 downloads
   - Verify file quality and correctness
   - Ensure file naming and organization meets your needs

4. **Regular Maintenance:**
   - Check indexer health weekly
   - Update Prowlarr and SABnzbd regularly
   - Review failed downloads and adjust metadata

5. **Security:**
   - Use HTTPS for Prowlarr/SABnzbd if exposed to internet
   - Protect API keys (don't commit to version control)
   - Restrict network access to arr stack (firewall rules)

---

## API Reference

### Search via Prowlarr

**Endpoint:** Internal, called by download orchestrator

**Function:** `src/lib/server/prowlarr.ts` → `searchBook()`

**Parameters:**
- `title`: Book title
- `author`: Book author
- `isbn`: ISBN-10 or ISBN-13 (optional but recommended)

**Returns:**
```typescript
{
  results: Array<{
    title: string;
    author: string;
    indexer: string;
    guid: string;
    size: number;
    publishDate: string;
  }>;
}
```

### Send to SABnzbd

**Endpoint:** Internal, called by download orchestrator

**Function:** `src/lib/server/sabnzbd.ts` → `addNzbDownload()`

**Parameters:**
- `nzbUrl`: URL to NZB file (from Prowlarr result)
- `category`: SABnzbd category (default: `books`)
- `priority`: Download priority (default: `Normal`)

**Returns:**
```typescript
{
  nzo_ids: string[];  // SABnzbd download IDs
}
```

### Check Download Status

**Endpoint:** Internal, called by polling job

**Function:** `src/lib/server/sabnzbd.ts` → `getDownloadStatus()`

**Parameters:**
- `nzbId`: SABnzbd download ID

**Returns:**
```typescript
{
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;  // 0-100
  filename: string;
  size: number;
  timeLeft: number;  // seconds
}
```

---

## Future Enhancements

Planned improvements to arr stack integration:

- [ ] Configurable confidence thresholds per user/request
- [ ] Manual result selection (show top 5 results, let admin choose)
- [ ] Advanced search filters (year range, language, format)
- [ ] Retry failed downloads after X hours/days
- [ ] Download queue management UI
- [ ] Integration with additional arr apps (Readarr, Lidarr for audiobooks)
- [ ] Notification on download completion (Discord, Telegram)
- [ ] Historical success rate tracking per indexer

---

## Support

For issues with arr stack integration:

1. Check [Troubleshooting](#troubleshooting) section
2. Review logs for error messages
3. Test Prowlarr and SABnzbd independently
4. Open an issue on [GitHub](https://github.com/yourusername/bookrequestarr/issues)

**When reporting issues, include:**
- Bookrequestarr version
- Prowlarr version
- SABnzbd version
- Number of indexers configured
- Sample confidence score breakdown (if applicable)
- Relevant log excerpts (sanitize API keys!)

---

## Additional Resources

- **Prowlarr Documentation:** https://wiki.servarr.com/prowlarr
- **SABnzbd Documentation:** https://sabnzbd.org/wiki/
- **Usenet Guide:** https://www.reddit.com/r/usenet/wiki/
- **Book Indexers:** https://www.reddit.com/r/usenet/wiki/indexers
- **Bookrequestarr GitHub:** https://github.com/yourusername/bookrequestarr
