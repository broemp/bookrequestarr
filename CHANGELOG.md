# Changelog

All notable changes to Bookrequestarr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive roadmap document outlining future development
- Screenshots section in README with detailed feature showcases

### Changed
- Updated README with better organization and roadmap references

### Fixed
- N/A

## [0.1.0] - 2025-11-02

### Added
- Initial release of Bookrequestarr
- OIDC authentication with group-based authorization
- Book search using Hardcover API
- Request management system (create, view, manage requests)
- Admin panel for request approval workflow
- User settings and preferences
- Discord webhook notifications
- Telegram bot notifications
- API response caching (7-day TTL)
- Dark theme UI with Tailwind CSS 4
- Docker and Docker Compose support
- Reverse proxy support (Traefik, Nginx, Caddy)
- SQLite database with Drizzle ORM
- Development mode with auth bypass
- Trending books on dashboard
- Request statistics and overview
- Language preference for book requests
- Special notes field for requests
- Request status tracking (pending, approved, rejected, completed)
- Book metadata caching
- Tag/genre support from Hardcover
- User management (admin only)
- Settings page for user preferences

### Technical Details
- Built with SvelteKit 2 and Svelte 5 (runes)
- TypeScript for type safety
- shadcn-svelte UI components
- Arctic library for OIDC
- JWT tokens in httpOnly cookies
- Structured logging
- Database migrations with Drizzle
- GraphQL integration with Hardcover API

## Release Notes

### [0.1.0] - Initial Release

This is the first public release of Bookrequestarr! 🎉

Bookrequestarr is a self-hosted book request management system, similar to Overseerr for movies and TV shows. It allows users to search for and request books, while administrators can manage these requests efficiently.

**Key Features:**
- Search for books using the Hardcover API
- Request books with language preferences
- Admin approval workflow
- Discord and Telegram notifications
- Modern, responsive UI
- Docker-ready deployment

**Known Limitations:**
- SQLite only (single instance)
- No audiobook-specific support yet
- No download automation yet
- English UI only

See the [Roadmap](ROADMAP.md) for planned features and improvements.

---

## Version History

- **0.1.0** (2025-11-02) - Initial release

---

## How to Read This Changelog

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

*For upcoming features and development plans, see [ROADMAP.md](ROADMAP.md)*

