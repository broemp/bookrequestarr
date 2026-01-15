# 🗺️ Bookrequestarr Roadmap

This document outlines the planned features, improvements, and future direction of Bookrequestarr.

## Current Status

Bookrequestarr is currently in **active development** with core functionality implemented:

- ✅ OIDC authentication
- ✅ Book search via Hardcover API
- ✅ Request management system
- ✅ Admin panel for request approval
- ✅ User settings and preferences
- ✅ Discord and Telegram notifications
- ✅ API caching system

## 🎯 Upcoming Milestones

### Milestone 1: Enhanced Search & Discovery

#### Better Search

- [ ] Server-side pagination for search results
- [ ] Advanced search filters:
  - Publication date range
  - Rating threshold
  - Page count range
  - Publisher filter
  - Series filter
- [ ] Save search preferences
- [ ] Search history
- [ ] "Similar books" recommendations
- [ ] Full-text search optimization
- [ ] Fuzzy search for typo tolerance
- [ ] Search by ISBN
- [ ] Search within results

#### Book Series Tracking

- [ ] Detect and display book series information
- [ ] "Request entire series" option
- [ ] Series progress tracking
- [ ] Automatic series completion notifications
- [ ] Filter books by series

### Milestone 2: Audiobook Support

#### Audiobook Features

- [ ] Add audiobook format detection in book metadata
- [ ] Allow users to specify audiobook preference in requests
- [ ] Filter audiobooks in search results
- [ ] Display audiobook-specific metadata (narrator, duration)
- [ ] Audiobook-specific request handling

### Milestone 3: Enhanced Notifications

#### Notification System

- [ ] Email notification support
- [ ] Customizable notification templates
- [ ] User notification preferences (per-channel opt-in/out)
- [ ] Notification for request status changes (approved, completed, rejected)
- [ ] Admin notification aggregation (daily digest option)

### Milestone 4: Enhanced Admin Features

#### Admin Tools

- [ ] Bulk request actions (approve/reject multiple)
- [ ] Request assignment to specific admins
- [ ] Admin activity log
- [ ] Request priority system
- [ ] Custom request statuses
- [ ] Request due dates and SLA tracking

### Milestone 5: Download Tool Integration

#### Download Automation

- [ ] Z-Library integration for automatic downloads
- [ ] Anna's Archive integration
- [ ] Calibre integration for library management
- [ ] Custom download script support
- [ ] Download status tracking
- [ ] Automatic format conversion (epub, mobi, pdf)

### Milestone 6: E-Reader Integration

#### E-Reader Support

- [ ] Send to Kindle support
- [ ] Kobo integration
- [ ] Direct email delivery to e-readers
- [ ] Cloud storage integration (Google Drive, Dropbox)

### Milestone 7: External Service Integration

#### Service Integrations

- [ ] Goodreads import/sync
- [ ] LibraryThing integration
- [ ] StoryGraph integration
- [ ] OpenLibrary fallback for metadata
- [ ] ISBN lookup services

### Milestone 8: Multi-language UI Support

#### Internationalization

- [ ] Internationalization (i18n) framework
- [ ] English, German, French, Spanish translations
- [ ] Community translation contributions
- [ ] Language-specific book recommendations

### Milestone 9: Advanced Dashboard

#### Dashboard Features

- [ ] Customizable dashboard widgets
- [ ] Request statistics and charts
- [ ] Reading goals and progress
- [ ] New releases by favorite authors
- [ ] Genre-based recommendations
- [ ] "Books like this" suggestions

### Milestone 10: Mobile App

#### Mobile Experience

- [ ] Progressive Web App (PWA) enhancements
- [ ] Native mobile app (React Native or Flutter)
- [ ] Push notifications
- [ ] Offline mode for browsing requests
- [ ] Barcode scanner for ISBN lookup

### Milestone 11: Automated Request Fulfillment

#### Automation Features

- [ ] Automatic download queue management
- [ ] Smart format selection based on user preferences
- [ ] Automatic quality checking
- [ ] Duplicate detection and deduplication
- [ ] Failed download retry logic
- [ ] Success/failure reporting

### Milestone 12: Advanced User Management

#### User Management

- [ ] User roles and permissions system
- [ ] Request quotas per user/role
- [ ] User groups and teams
- [ ] Request approval workflows
- [ ] Delegated admin permissions

### Milestone 13: Analytics and Reporting

#### Reporting Features

- [ ] Request trends and statistics
- [ ] Popular books and authors
- [ ] User activity reports
- [ ] Download success rates
- [ ] Genre popularity analysis
- [ ] Export reports (CSV, PDF)

### Milestone 14: Database Enhancements

#### Database Improvements

- [ ] PostgreSQL support (for multi-instance deployments)
- [ ] Database migration from SQLite to PostgreSQL
- [ ] Full-text search optimization
- [ ] Database backup and restore tools
- [ ] Read replicas support

### Milestone 15: Performance and Scalability

#### Performance Improvements

- [ ] Redis caching layer
- [ ] CDN support for book covers
- [ ] Lazy loading and infinite scroll optimization
- [ ] Background job queue (Bull, BullMQ)
- [ ] Horizontal scaling support
- [ ] Load balancing configuration

### Milestone 16: Security Enhancements

#### Security Features

- [ ] Two-factor authentication (2FA)
- [ ] API key management for integrations
- [ ] Rate limiting per user
- [ ] Advanced audit logging
- [ ] Security headers and CSP
- [ ] Automated security scanning

## 🔮 Future Considerations

These features are under consideration but not yet committed to the roadmap:

- **AI-powered Recommendations**: Use machine learning to suggest books based on user history
- **Automatic Genre Detection**: AI-based genre classification for books without metadata
- **Voice Search**: Voice-activated book search
- **Reading Progress Tracking**: Sync with e-readers to track reading progress
- **Subscription Management**: Track and manage book subscription services
- **Price Tracking**: Monitor book prices across platforms

## 🤝 Contributing to the Roadmap

We welcome community input on the roadmap! Here's how you can contribute:

1. **Feature Requests**: Open an issue with the `feature-request` label
2. **Priority Feedback**: Comment on existing roadmap issues to express interest
3. **Implementation**: Pick up a roadmap item and submit a PR
4. **Discussion**: Join discussions in GitHub Discussions

### How Features Get Prioritized

Features are prioritized based on:

- **User demand**: Number of requests and upvotes
- **Impact**: How many users will benefit
- **Effort**: Development time and complexity
- **Dependencies**: Prerequisites and technical requirements
- **Strategic fit**: Alignment with project vision

## 🐛 Known Issues

Current known issues that will be addressed:

- SQLite doesn't support multiple concurrent writers (limits to single instance)
- Some Hardcover API fields may change without notice (requires monitoring)
- Large book cover images can slow down initial page loads (needs optimization)
- Search results don't paginate server-side (all loaded at once)
- No rate limiting on API endpoints (could be abused)

## 📝 Notes

- This roadmap is subject to change based on community feedback and development priorities
- Features may be added, removed, or reprioritized as the project evolves
- Security and bug fixes always take priority over new features
- Milestones are not time-bound and will be completed based on priority and resources

## 📞 Feedback

Have thoughts on the roadmap? We'd love to hear from you!

- **GitHub Issues**: For specific feature requests
- **GitHub Discussions**: For general roadmap discussion
- **Discord**: Join our community server (coming soon)

---

_This roadmap represents our current vision for Bookrequestarr. We're excited about the future and grateful for your support!_
