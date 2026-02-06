# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bookrequestarr is a self-hosted book request management system (similar to Overseerr for movies). Built with SvelteKit 2 + Svelte 5, it integrates with Hardcover API for book metadata, supports OIDC authentication, and can automatically download requested books from Anna's Archive or via Prowlarr/SABnzbd.

## Essential Commands

### Development

```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build
npm run check            # Type checking with svelte-check
npm run lint             # ESLint + Prettier check
npm run format           # Format code with Prettier
```

**Git Hooks**: Pre-push hooks automatically run linting before pushing. Hooks are auto-installed via `npm install` (postinstall script). Manual install: `./.githooks/install.sh`

### Database

```bash
npm run db:generate      # Generate new migration from schema changes
npm run db:migrate       # Apply pending migrations (auto-runs on startup)
npm run db:studio        # Open Drizzle Studio GUI
```

Database migrations are automatically applied on application startup via `src/lib/server/db/migrate.ts`. Manual migration is only needed for development.

### Development Mode (No Auth)

Set `DISABLE_AUTH=true` in `.env` to bypass OIDC and auto-login as admin user (NEVER use in production).

## Architecture & Key Patterns

### Tech Stack

- **Frontend**: SvelteKit 2 with Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Tailwind CSS 4 with shadcn-svelte components
- **Backend**: SvelteKit API routes (`+server.ts`) with server load functions (`+page.server.ts`)
- **Database**: SQLite with Drizzle ORM (auto-migrates on startup)
- **Auth**: OIDC via Arctic library, group-based roles (user/admin)
- **External APIs**: Hardcover GraphQL API (book metadata), Anna's Archive (downloads)

### Authentication Flow

- OIDC authentication with group-based authorization
  - Users in `OIDC_ADMIN_GROUP` (default: `bookrequestarr_admin`) get admin role
  - All other authenticated users get user role
- JWT tokens stored in httpOnly cookies (7-day expiry)
- Session validation in `hooks.server.ts` attaches `locals.user` to all requests
- Protected routes check `locals.user` existence, admin routes check `role === 'admin'`

### Database Architecture

Key tables and relationships:

- **users**: User accounts with OIDC integration (`oidcSub` links to identity provider)
- **books**: Cached book metadata from Hardcover API with authors and tags
- **authors**: Unique authors from Hardcover (many-to-many via `bookAuthors`)
- **tags**: Book genres/tags from Hardcover (many-to-many via `bookTags`)
- **requests**: Book requests with status workflow (pending → approved → completed/rejected)
- **downloads**: Download tracking for Anna's Archive and Prowlarr/SABnzbd
- **settings**: Application configuration stored in database

All foreign keys use CASCADE delete for data integrity.

### Local Book Caching (Hardcover API)

Located in `src/lib/server/hardcover.ts`:

**Single-Tier Local Cache:**
- Stores book metadata (books, authors, tags tables) directly in the database
- Default TTL: 6 hours (configurable via `local_book_cache_ttl_hours` setting)
- Cache flow:
  1. Check local database for book by ID
  2. If found and not stale (within TTL), return cached data
  3. If not found or stale, fetch from Hardcover API
  4. Store/update in local database with current timestamp
- Provides 90%+ cache hit rate for frequently accessed books
- No intermediate API response caching layer (removed for simplicity)

**Important**: When adding new Hardcover API queries, always verify field availability first since Hardcover API schema can change.

### Download System Architecture

Multi-source download system supporting automatic book acquisition. See [docs/ARR_STACK.md](docs/ARR_STACK.md) for comprehensive Prowlarr/SABnzbd setup and troubleshooting.

1. **Anna's Archive** (`src/lib/server/annasarchive.ts`):
   - Direct HTTP downloads from Anna's Archive
   - Domain fallback for reliability (tries multiple domains)
   - Search by ISBN (preferred) or title+author
   - Automatic format selection (epub > pdf > mobi)

2. **Prowlarr + SABnzbd** (`src/lib/server/prowlarr.ts`, `src/lib/server/sabnzbd.ts`):
   - Usenet downloading via NZB files
   - Prowlarr searches indexers for best match
   - SABnzbd handles download queue
   - Status polling every 30 seconds (configured in `hooks.server.ts`)
   - **See docs/ARR_STACK.md for detailed setup guide**

3. **Download Orchestrator** (`src/lib/server/downloadOrchestrator.ts`):
   - Coordinates download attempts across sources
   - Intelligent result matching with confidence scoring (see Result Matcher)
   - Retry logic with progressive fallback
   - Updates request status based on download completion

4. **Result Matcher** (`src/lib/server/resultMatcher.ts`):
   - Scores search results by ISBN (50%), title (25%), author (15%), year (5%), language (5%)
   - Confidence levels: High (80-100), Medium (50-79), Low (0-49)
   - Auto-download only high-confidence matches, skip low-confidence results

### Request Workflow

1. User searches for book (Hardcover API)
2. User creates request with language preference and notes
3. Admin sees request in admin panel (pending status)
4. Admin approves request
5. If auto-download enabled: system attempts download
   - Tries Anna's Archive first (if configured)
   - Falls back to Prowlarr/SABnzbd (if configured)
   - Updates request status to 'completed' or 'download_problem'
6. Admin can manually complete or reject requests

Language-specific duplicate checking: same book in different language is allowed.

### Background Jobs (hooks.server.ts)

- **Cleanup Job**: Runs every hour, removes old completed/failed downloads
- **SABnzbd Polling**: Runs every 30 seconds, updates download statuses
- **Settings Initialization**: Syncs environment variables to database on startup

### Logging Strategy

Structured logging via `src/lib/server/logger.ts`:

- Levels: debug, info, warn, error
- Format: Structured JSON with timestamps
- Guidelines:
  - Log cache hits/misses explicitly
  - Include context (IDs, operation type)
  - Don't log complete API request/response bodies
  - Log important state changes and errors

### Code Style

- **Go-style**: Prioritize readability, simplicity, maintainability
- **TypeScript**: Strict mode, avoid `any` types
- **Error Handling**: Explicit try-catch blocks with meaningful messages
- **Svelte 5**: Use runes (`$state`, `$derived`, `$effect`) not legacy stores

## Project Structure

```
src/
├── lib/
│   ├── components/ui/        # shadcn-svelte components
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle schema (all tables)
│   │   │   ├── index.ts      # Database connection
│   │   │   └── migrate.ts    # Auto-migration on startup
│   │   ├── auth.ts           # OIDC + session management
│   │   ├── hardcover.ts      # Hardcover API client (two-tier cache)
│   │   ├── annasarchive.ts   # Anna's Archive downloads
│   │   ├── prowlarr.ts       # Prowlarr search integration
│   │   ├── sabnzbd.ts        # SABnzbd download client
│   │   ├── downloadOrchestrator.ts  # Download coordination
│   │   ├── resultMatcher.ts  # Search result scoring
│   │   ├── cache.ts          # API response caching
│   │   ├── logger.ts         # Structured logging
│   │   └── notifications/    # Discord + Telegram
│   ├── types/                # TypeScript definitions
│   └── utils/                # Utility functions
├── routes/
│   ├── (app)/                # Protected routes (require auth)
│   │   ├── dashboard/        # Dashboard with trending books
│   │   ├── search/           # Book search interface
│   │   ├── requests/         # User's requests
│   │   ├── settings/         # User settings
│   │   └── admin/            # Admin panel (require role='admin')
│   │       ├── requests/     # Approve/reject requests
│   │       ├── downloads/    # Download management
│   │       ├── users/        # User management
│   │       └── settings/     # System settings
│   └── api/                  # API endpoints
│       ├── auth/             # Login/logout/callback
│       ├── books/            # Search, details, series
│       ├── requests/         # Create, check duplicates
│       ├── downloads/        # Initiate, status, retry
│       └── admin/            # Admin operations
└── hooks.server.ts           # Auth middleware + background jobs
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create `src/routes/api/yourfeature/+server.ts`
2. Export handler functions (GET, POST, etc.)
3. Check authentication via `locals.user`
4. Return JSON responses via `json()` helper

Example:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	// Your logic here
	return json({ data: result });
};
```

### Adding a Database Table

1. Update `src/lib/server/db/schema.ts` with Drizzle schema
2. Run `npm run db:generate` to create migration file
3. Migration will auto-apply on next app startup
4. Update TypeScript types in `src/lib/types/`

### Adding a New Hardcover API Query

1. Verify field availability (Hardcover schema changes frequently)
2. Add function to `src/lib/server/hardcover.ts`
3. Use `graphqlQuery()` helper for automatic caching
4. Handle errors gracefully with logger
5. Cache results with `cacheBook()` if needed

### Adding a New Page

1. Create `src/routes/(app)/yourpage/+page.svelte` for UI
2. Optional: Create `+page.server.ts` for server-side data loading
3. Use Svelte 5 runes for state management
4. Protect route by placing in `(app)` group (auto-checks auth)

Example:

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let state = $state(initialValue);
	let derived = $derived(state * 2);
</script>
```

### Implementing a Download Source

1. Create client in `src/lib/server/` (e.g., `newsource.ts`)
2. Implement search and download functions
3. Add to `downloadOrchestrator.ts` workflow
4. Update `downloads` schema if needed (add source-specific fields)
5. Add settings for configuration (API keys, URLs, etc.)

## Environment Variables

### Required

- `DATABASE_URL`: SQLite database path (e.g., `./data/bookrequestarr.db`)
- `HARDCOVER_API_KEY`: Hardcover API key (get from hardcover.app/settings/api)
- `OIDC_ISSUER`: OIDC provider URL
- `OIDC_CLIENT_ID`: OIDC client ID
- `OIDC_CLIENT_SECRET`: OIDC client secret
- `OIDC_REDIRECT_URI`: OAuth callback URL
- `JWT_SECRET`: JWT signing secret (generate with `openssl rand -base64 32`)
- `PUBLIC_APP_URL`: Public application URL

### Optional

- `OIDC_ADMIN_GROUP`: OIDC group for admin role (default: `bookrequestarr_admin`)
- `DISABLE_AUTH`: Bypass auth in development (NEVER use in production)
- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `TELEGRAM_CHAT_ID`: Telegram chat ID
- `ANNAS_ARCHIVE_DOMAIN`: Custom Anna's Archive domain
- `PROWLARR_URL`: Prowlarr API URL
- `PROWLARR_API_KEY`: Prowlarr API key
- `SABNZBD_URL`: SABnzbd API URL
- `SABNZBD_API_KEY`: SABnzbd API key
- `CALIBRE_WEB_URL`: Calibre-Web Automated URL for automatic ingestion
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

Settings can also be configured via admin panel (stored in `settings` table).

## Important Constraints

### SQLite Limitations

- Single writer at a time (no horizontal scaling)
- File-based database (needs persistent volume in Docker)
- Not suitable for high-concurrency write workloads

### Hardcover API

- Rate limits apply (caching mitigates this)
- Schema can change without notice (verify fields before use)
- Some books may have incomplete metadata

### Download Sources

- Anna's Archive domains change frequently (domain fallback implemented)
- Prowlarr requires proper indexer configuration
- SABnzbd polling adds background load (30s interval)

## Troubleshooting

### Database is locked

SQLite allows only one writer. Check for:

- Long-running transactions
- Multiple instances accessing same database file
- Insufficient file permissions

### Hardcover API errors

1. Verify field exists with introspection
2. Check API key validity
3. Review error logs for GraphQL validation errors
4. Check cache TTL settings

### Download failures

1. Check Anna's Archive domain connectivity (try manual fallback)
2. Verify Prowlarr indexers are configured and healthy
3. Check SABnzbd is running and API key is correct
4. Review download logs for error messages
5. Check confidence scores in result matcher

### Authentication issues

1. Verify OIDC configuration (issuer URL, client ID/secret)
2. Check redirect URI matches OIDC provider
3. Ensure user is in correct OIDC groups
4. Use `DISABLE_AUTH=true` for local testing

## Additional Documentation

Comprehensive documentation is in the `docs/` folder:

- `CONFIGURATION.md`: Detailed environment setup, OIDC providers
- `DEPLOYMENT.md`: Docker deployment, reverse proxy setup
- `DEVELOPMENT.md`: Local development workflow
- `CURSOR_GUIDE.md`: Extensive guide for AI assistants
- `ROADMAP.md`: Planned features and enhancements

Main user documentation: `README.md`
