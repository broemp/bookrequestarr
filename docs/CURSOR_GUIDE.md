# Cursor AI Development Guide

This document contains information for AI assistants (like Cursor) working on this codebase.

## Project Overview

Bookrequestarr is a book request management system similar to Overseerr, built with SvelteKit 2, Svelte 5, TypeScript, and Tailwind CSS 4. It integrates with the Hardcover API for book metadata and supports OIDC authentication.

## Technology Stack

### Frontend
- **Framework**: SvelteKit 2 with Svelte 5 (using runes: `$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Tailwind CSS 4 with custom HSL color variables
- **UI Components**: shadcn-svelte (Button, Card, Input, Badge), custom components
- **State Management**: Svelte 5 runes (no external state management needed)

### Backend
- **Runtime**: Node.js with SvelteKit's built-in server capabilities
- **API Routes**: SvelteKit API routes (`+server.ts`) and server load functions (`+page.server.ts`)
- **Database**: SQLite with Drizzle ORM
- **Authentication**: OIDC (generic provider) with Arctic library, JWT tokens in httpOnly cookies
- **External APIs**: Hardcover GraphQL API for book metadata

### Key Libraries
- `drizzle-orm`: Database ORM
- `arctic`: OIDC authentication
- `jose`: JWT token handling
- `lucide-svelte`: Icon library

## Project Structure

```
bookrequestarr/
├── src/
│   ├── lib/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # shadcn-svelte components
│   │   │   └── ...           # Custom components
│   │   ├── server/           # Server-side code
│   │   │   ├── db/
│   │   │   │   ├── schema.ts # Drizzle schema definitions
│   │   │   │   └── index.ts  # Database connection
│   │   │   ├── hardcover.ts  # Hardcover API client
│   │   │   ├── auth.ts       # Authentication logic
│   │   │   └── logger.ts     # Structured logging
│   │   ├── stores/           # Client-side stores
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Utility functions
│   ├── routes/
│   │   ├── (app)/            # Authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── search/
│   │   │   ├── requests/
│   │   │   ├── settings/
│   │   │   └── admin/
│   │   ├── api/              # API endpoints
│   │   │   ├── books/
│   │   │   └── requests/
│   │   ├── auth/             # Authentication routes
│   │   └── +layout.svelte    # Root layout
│   ├── hooks.server.ts       # SvelteKit server hooks (auth, dev user)
│   └── app.css               # Global styles
├── drizzle/                  # Database migrations
├── data/                     # SQLite database file
└── static/                   # Static assets
```

## Database Schema

### Core Tables
- **`users`**: User accounts with OIDC integration
  - Fields: id, oidcId, email, name, role (user/admin), preferredLanguage, createdAt, updatedAt
- **`books`**: Cached book metadata from Hardcover API
  - Fields: id (UUID), hardcoverId, title, author, description, coverImage, isbn, publishDate, language, pages, publisher, rating, ratingCount, cachedAt
- **`requests`**: Book requests from users
  - Fields: id, userId (FK), bookId (FK), preferredLanguage, specialNotes, status (pending/approved/rejected/completed), createdAt, updatedAt
- **`tags`**: Book tags/genres from Hardcover
- **`bookTags`**: Junction table for books and tags
- **`api_cache`**: API response cache with TTL

### Relationships
- `requests.userId` → `users.id` (CASCADE delete)
- `requests.bookId` → `books.id` (CASCADE delete)
- `bookTags.bookId` → `books.id` (CASCADE delete)
- `bookTags.tagId` → `tags.id` (CASCADE delete)

## Key Implementation Patterns

### 1. Authentication Flow
- OIDC authentication with group-based authorization (`bookrequestarr`, `bookrequestarr_admin`)
- JWT tokens stored in httpOnly cookies
- `DISABLE_AUTH=true` for development (auto-creates `dev-admin` user)
- Auth middleware in `hooks.server.ts` validates tokens and attaches `locals.user`

### 2. Hardcover API Integration
- **Location**: `src/lib/server/hardcover.ts`
- **Pattern**: GraphQL queries with response caching (7-day TTL)
- **Key Functions**:
  - `searchBooks(query, limit)`: Search for books
  - `getBookDetails(hardcoverId)`: Fetch full book details
  - `getTrendingBooks(limit)`: Two-step query (fetch IDs, then details)
  - `getBooksBySeries(seriesId)`: Fetch books in a series
  - `cacheBook(book)`: Store book metadata in local DB
- **Caching Strategy**:
  - API response cache: 7 days (full GraphQL responses)
  - Book metadata cache: Used for request records only
- **Important**: Always use introspection to verify field availability before querying

### 3. Request Management
- Users can request books with preferred language and special notes
- Language-specific duplicate checking (same book, different language = allowed)
- Admin workflow: pending → approved → completed (or rejected)
- "Active" filter shows both pending and approved requests by default

### 4. UI Patterns

#### Modals
- Click outside or press Escape to close
- Body scroll prevention when open
- Accessible with ARIA roles and keyboard handlers

#### Search & Filtering
- Debounced search (300ms)
- Infinite scroll with frontend pagination
- Filters: collections, unreleased, no ebook, unknown authors, non-English
- "Requested" badges on already-requested books

#### Forms
- Client-side submission with `fetch`
- Toast notifications for feedback
- Server-side validation and error handling

### 5. Logging Strategy
- **Location**: `src/lib/server/logger.ts`
- **Levels**: debug, info, warn, error
- **Format**: Structured JSON with timestamps
- **Guidelines**:
  - Log cache hits/misses explicitly
  - Don't log complete request/response bodies
  - Log important state changes and errors
  - Include context (IDs, operation type)

## Development Guidelines

### Adding New Features

#### 1. New API Endpoint
```typescript
// src/routes/api/feature/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  // Check authentication
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Your logic here
  return json({ data: result });
};
```

#### 2. New Database Table
1. Update `src/lib/server/db/schema.ts` with Drizzle schema
2. Create migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`
4. Update types in `src/lib/types/`

#### 3. New Hardcover API Query
1. Use introspection to verify fields exist
2. Add function to `src/lib/server/hardcover.ts`
3. Use `graphqlQuery()` helper for automatic caching
4. Handle errors gracefully with logging

#### 4. New Page/Route
```typescript
// src/routes/(app)/feature/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Server-side data loading
  return { data };
};
```

```svelte
<!-- src/routes/(app)/feature/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  
  // Use Svelte 5 runes
  let state = $state(initialValue);
  let derived = $derived(state * 2);
</script>
```

### Svelte 5 Runes Usage
- `$state()`: Reactive state
- `$derived()`: Computed values
- `$effect()`: Side effects (replaces `onMount` for most cases)
- `$props()`: Component props
- Use `onMount()` from 'svelte' for lifecycle hooks

### Code Style
- **Go-style**: Prioritize readability, simplicity, maintainability
- **Error Handling**: Explicit error checks, meaningful messages
- **TypeScript**: Strict mode, avoid `any` where possible
- **Formatting**: Use project's Prettier/ESLint config

## API Endpoints

### Authentication
- `POST /api/auth/login` - Initiate OIDC login
- `GET /api/auth/callback` - OIDC callback handler
- `POST /api/auth/logout` - Logout and clear session

### Books
- `GET /api/books/search?q={query}` - Search for books
- `GET /api/books/{hardcoverId}` - Get book details
- `GET /api/books/trending` - Get trending books

### Requests
- `POST /api/requests/create` - Create a new request
- `GET /api/requests` - Get user's requests
- `GET /api/admin/requests` - Get all requests (admin only)
- `PATCH /api/admin/requests/{id}` - Update request status (admin only)

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `PATCH /api/admin/users/{id}` - Update user (admin only)
- `POST /api/admin/recache-book` - Force recache book metadata (admin only)

### Notifications
- `POST /api/notifications/test` - Test notification backends (admin only)

## Environment Variables

### Required
- `DATABASE_URL` - SQLite database path
- `HARDCOVER_API_KEY` - Hardcover API key
- `OIDC_ISSUER` - OIDC provider URL
- `OIDC_CLIENT_ID` - OIDC client ID
- `OIDC_CLIENT_SECRET` - OIDC client secret
- `OIDC_REDIRECT_URI` - OAuth callback URL
- `JWT_SECRET` - JWT signing secret
- `PUBLIC_APP_URL` - Public application URL

### Optional
- `DISABLE_AUTH` - Bypass authentication (development only)
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat ID
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `API_CACHE_TTL_DAYS` - API cache TTL in days (default: 7)

## Common Tasks

### Adding a New Book Field
1. Update `HardcoverBook` interface in `src/lib/types/book.ts`
2. Update GraphQL query in `src/lib/server/hardcover.ts`
3. Update `cacheBook()` function to store the field
4. Add migration for database schema change
5. Update UI components to display the field

### Implementing a New Filter
1. Add state in search page: `let filterName = $state(false);`
2. Add UI checkbox/toggle
3. Update `filterUnwantedBooks()` function
4. Apply filter in search results

### Adding a New Request Status
1. Update `RequestStatus` type in `src/lib/types/request.ts`
2. Update database enum if using constraints
3. Update status badge colors in UI
4. Update admin request management logic

## Troubleshooting

### Hardcover API Errors
1. Check field availability with introspection
2. Verify API key is set and valid
3. Check rate limits and caching
4. Review error logs for GraphQL validation errors

### Database Issues
1. Check migrations are applied: `npm run db:migrate`
2. Verify foreign key constraints
3. Check for locked database (SQLite limitation)
4. Review logs for constraint violations

### Authentication Issues
1. Verify OIDC configuration
2. Check JWT token expiration
3. Ensure group membership for authorization
4. Use `DISABLE_AUTH=true` for local development

## Resources
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Hardcover API](https://hardcover.app/api)
- [Tailwind CSS](https://tailwindcss.com/docs)

