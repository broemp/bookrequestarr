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

## 🎯 Short-term Goals (Next 1-3 Months)

### High Priority

#### 1. Audiobook Support
- [ ] Add audiobook format detection in book metadata
- [ ] Allow users to specify audiobook preference in requests
- [ ] Filter audiobooks in search results
- [ ] Display audiobook-specific metadata (narrator, duration)

#### 2. Enhanced Notifications
- [ ] Email notification support
- [ ] Customizable notification templates
- [ ] User notification preferences (per-channel opt-in/out)
- [ ] Notification for request status changes (approved, completed, rejected)
- [ ] Admin notification aggregation (daily digest option)

#### 3. Request Comments and Discussion
- [ ] Add comment system to requests
- [ ] Allow users to add notes/updates to their requests
- [ ] Admin comments visible to requesters
- [ ] Email notifications for new comments

#### 4. Improved Search and Filtering
- [ ] Advanced search filters:
  - Publication date range
  - Rating threshold
  - Page count range
  - Publisher filter
  - Series filter
- [ ] Save search preferences
- [ ] Search history
- [ ] "Similar books" recommendations

### Medium Priority

#### 5. Book Series Tracking
- [ ] Detect and display book series information
- [ ] "Request entire series" option
- [ ] Series progress tracking
- [ ] Automatic series completion notifications

#### 6. Reading Lists and Collections
- [ ] User-created reading lists
- [ ] Public/private list visibility
- [ ] Share lists with other users
- [ ] "Request all books in list" bulk action
- [ ] Curated lists by admins

#### 7. Enhanced Admin Features
- [ ] Bulk request actions (approve/reject multiple)
- [ ] Request assignment to specific admins
- [ ] Admin activity log
- [ ] Request priority system
- [ ] Custom request statuses
- [ ] Request due dates and SLA tracking

## 🚀 Mid-term Goals (3-6 Months)

### Integration Features

#### 8. Download Tool Integration
- [ ] Z-Library integration for automatic downloads
- [ ] Anna's Archive integration
- [ ] Calibre integration for library management
- [ ] Custom download script support
- [ ] Download status tracking
- [ ] Automatic format conversion (epub, mobi, pdf)

#### 9. E-Reader Integration
- [ ] Send to Kindle support
- [ ] Kobo integration
- [ ] Direct email delivery to e-readers
- [ ] Cloud storage integration (Google Drive, Dropbox)

#### 10. External Service Integration
- [ ] Goodreads import/sync
- [ ] LibraryThing integration
- [ ] StoryGraph integration
- [ ] OpenLibrary fallback for metadata
- [ ] ISBN lookup services

### User Experience Improvements

#### 11. Multi-language UI Support
- [ ] Internationalization (i18n) framework
- [ ] English, German, French, Spanish translations
- [ ] Community translation contributions
- [ ] Language-specific book recommendations

#### 12. Advanced Dashboard
- [ ] Customizable dashboard widgets
- [ ] Request statistics and charts
- [ ] Reading goals and progress
- [ ] New releases by favorite authors
- [ ] Genre-based recommendations
- [ ] "Books like this" suggestions

#### 13. Mobile App
- [ ] Progressive Web App (PWA) enhancements
- [ ] Native mobile app (React Native or Flutter)
- [ ] Push notifications
- [ ] Offline mode for browsing requests
- [ ] Barcode scanner for ISBN lookup

## 🌟 Long-term Goals (6-12 Months)

### Advanced Features

#### 14. Automated Request Fulfillment
- [ ] Automatic download queue management
- [ ] Smart format selection based on user preferences
- [ ] Automatic quality checking
- [ ] Duplicate detection and deduplication
- [ ] Failed download retry logic
- [ ] Success/failure reporting

#### 15. Advanced User Management
- [ ] User roles and permissions system
- [ ] Request quotas per user/role
- [ ] User groups and teams
- [ ] Request approval workflows
- [ ] Delegated admin permissions

#### 16. Analytics and Reporting
- [ ] Request trends and statistics
- [ ] Popular books and authors
- [ ] User activity reports
- [ ] Download success rates
- [ ] Genre popularity analysis
- [ ] Export reports (CSV, PDF)

#### 17. Social Features
- [ ] User profiles and bios
- [ ] Follow other users
- [ ] Book reviews and ratings
- [ ] Discussion forums
- [ ] Book clubs and reading groups
- [ ] Activity feed

### Technical Improvements

#### 18. Database Enhancements
- [ ] PostgreSQL support (for multi-instance deployments)
- [ ] Database migration from SQLite to PostgreSQL
- [ ] Full-text search optimization
- [ ] Database backup and restore tools
- [ ] Read replicas support

#### 19. Performance and Scalability
- [ ] Redis caching layer
- [ ] CDN support for book covers
- [ ] Lazy loading and infinite scroll optimization
- [ ] Background job queue (Bull, BullMQ)
- [ ] Horizontal scaling support
- [ ] Load balancing configuration

#### 20. Security Enhancements
- [ ] Two-factor authentication (2FA)
- [ ] API key management for integrations
- [ ] Rate limiting per user
- [ ] Advanced audit logging
- [ ] Security headers and CSP
- [ ] Automated security scanning

## 🔮 Future Considerations

### Experimental Features

These features are under consideration but not yet committed to the roadmap:

- **AI-powered Recommendations**: Use machine learning to suggest books based on user history
- **Automatic Genre Detection**: AI-based genre classification for books without metadata
- **Voice Search**: Voice-activated book search
- **Reading Progress Tracking**: Sync with e-readers to track reading progress
- **Book Lending System**: Share books between users with time limits
- **Subscription Management**: Track and manage book subscription services
- **Price Tracking**: Monitor book prices across platforms
- **Wishlist Sharing**: Share wishlists with friends/family
- **Gift Requests**: Allow users to request books as gifts for others
- **Reading Challenges**: Create and participate in reading challenges

## 📊 Priority Matrix

| Feature | Priority | Effort | Impact | Status |
|---------|----------|--------|--------|--------|
| Audiobook Support | High | Medium | High | Planned |
| Enhanced Notifications | High | Low | High | Planned |
| Request Comments | High | Medium | Medium | Planned |
| Download Integration | High | High | Very High | Planned |
| Series Tracking | Medium | Medium | Medium | Planned |
| Reading Lists | Medium | Medium | High | Planned |
| Multi-language UI | Medium | High | Medium | Planned |
| Mobile App | Low | Very High | High | Future |
| Social Features | Low | High | Medium | Future |
| AI Recommendations | Low | Very High | Medium | Experimental |

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

## 📅 Release Schedule

We follow a **rolling release** model with continuous deployment:

- **Minor releases**: Every 2-4 weeks with bug fixes and small features
- **Major releases**: Every 2-3 months with significant new features
- **Patch releases**: As needed for critical bugs and security issues

## 🐛 Known Issues

Current known issues that will be addressed:

- SQLite doesn't support multiple concurrent writers (limits to single instance)
- Some Hardcover API fields may change without notice (requires monitoring)
- Large book cover images can slow down initial page loads (needs optimization)
- Search results don't paginate server-side (all loaded at once)
- No rate limiting on API endpoints (could be abused)

## 📝 Notes

- This roadmap is subject to change based on community feedback and development priorities
- Dates and timelines are estimates and may shift
- Features may be added, removed, or reprioritized as the project evolves
- Security and bug fixes always take priority over new features

## 📞 Feedback

Have thoughts on the roadmap? We'd love to hear from you!

- **GitHub Issues**: For specific feature requests
- **GitHub Discussions**: For general roadmap discussion
- **Discord**: Join our community server (coming soon)

---

**Last Updated**: November 2, 2025  
**Next Review**: February 2026

*This roadmap represents our current vision for Bookrequestarr. We're excited about the future and grateful for your support!*

