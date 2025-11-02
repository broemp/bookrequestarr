# Development Guide

## Quick Start Without OIDC

For rapid development and testing, you can bypass the OIDC authentication system entirely.

### Setup

1. Add the following to your `.env` file:

```bash
DATABASE_URL=./data/bookrequestarr.db
DISABLE_AUTH=true
```

2. Run the application:

```bash
npm run db:migrate
npm run dev
```

3. Open your browser to `http://localhost:5173`

You'll be automatically logged in as an admin user.

### ⚠️ Important Security Notes

**NEVER use `DISABLE_AUTH=true` in production!**

This feature is strictly for local development and testing. It completely bypasses all security measures.

## Development Workflow

### 1. Database Changes

When you modify the schema:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Or push directly (development only)
npm run db:push
```

### 2. Code Quality

```bash
# Type checking
npm run check

# Linting
npm run lint

# Formatting
npm run format
```

### 3. Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### 4. Database Management

```bash
# Open Drizzle Studio
npm run db:studio
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Apply database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio

## Common Development Tasks

### Adding a New Page

1. Create the route file: `src/routes/(app)/yourpage/+page.svelte`
2. Add server load function if needed: `+page.server.ts`
3. Add to navigation in `src/routes/(app)/+layout.svelte`

### Adding a New API Endpoint

1. Create: `src/routes/api/yourapi/+server.ts`
2. Export `GET`, `POST`, etc. handlers
3. Add authentication check if needed (automatic with `locals.user`)

### Adding a New Database Table

1. Add to `src/lib/server/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`
4. Create TypeScript types in `src/lib/types/`

## Troubleshooting

### "Database locked" Error

SQLite doesn't support concurrent writes. Make sure only one instance is running.

### Changes Not Reflecting

1. Check if the dev server is running
2. Try clearing `.svelte-kit` folder: `rm -rf .svelte-kit`
3. Restart the dev server

### Type Errors

Run `npm run check` to see all TypeScript errors. The dev server may not show all of them.

### Port Already in Use

Change the port:

```bash
npm run dev -- --port 5174
```

## Best Practices

1. **Always use TypeScript types** - No `any` types
2. **Format before committing** - Run `npm run format`
3. **Check types** - Run `npm run check`
4. **Use proper error handling** - Try-catch in API routes
5. **Add loading states** - Better UX
6. **Test with real auth** - Before deploying
7. **Never commit `.env`** - Use `.env.example`
8. **Document new features** - Update documentation

