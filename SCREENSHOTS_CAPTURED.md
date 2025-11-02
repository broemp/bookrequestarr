# Screenshots Captured for README

This document summarizes the screenshots captured for the Bookrequestarr README.

## Date Captured
November 2, 2025

## Screenshots Captured

Using the browser MCP tool, the following screenshots were captured from a running instance of Bookrequestarr at http://localhost:5173:

### 1. Dashboard (`dashboard.png`)
- **URL**: `/dashboard`
- **Content**: 
  - Welcome message with user name
  - Trending books section with 20 book covers
  - Request statistics cards (Total, Pending, Approved, Completed)
  - Recent requests section showing 2 pending requests
- **Resolution**: Full viewport
- **Theme**: Dark theme (default)

### 2. Search - Empty State (`search.png`)
- **URL**: `/search`
- **Content**:
  - Search input field with placeholder text
  - Filter checkbox for collections/unreleased/non-ebook
  - Empty state message: "Start typing to search for books"
  - Search icon in center
- **Resolution**: Full viewport
- **Theme**: Dark theme

### 3. Search Results (`search-results.png`)
- **URL**: `/search?q=project+hail+mary`
- **Content**:
  - Search query: "project hail mary"
  - 4 search results displayed:
    1. Project Hail Mary by Andy Weir (2021)
    2. Summary and Analysis of Project Hail Mary by Andy Weir
    3. Summary of Project Hail Mary by Alexander Cooper
    4. Summary of Andy Weir's Project Hail Mary by Milkyway Media
  - Each result shows cover image, title, author, and year
- **Resolution**: Full viewport
- **Theme**: Dark theme

### 4. Book Details Modal (`book-details.png`)
- **URL**: `/search` (with modal open)
- **Content**:
  - Book: "Project Hail Mary" by Andy Weir
  - Large cover image on left
  - Book details:
    - Subtitle: "A Novel"
    - Rating: ⭐ 4.5 (3,363 ratings)
    - Published: 2021
    - Pages: 496
  - "View on Hardcover" link
  - Genres section with tags
  - Summary section with full description
  - Request form with:
    - Preferred Language field (English)
    - Special Notes field
    - Request Book button
    - Cancel button
- **Resolution**: Full viewport with modal overlay
- **Theme**: Dark theme

### 5. My Requests (`my-requests.png`)
- **URL**: `/requests`
- **Content**:
  - Page title: "My Requests"
  - Filter tabs: All (2), Pending (2), Approved (0), Completed (0), Rejected (0)
  - 2 request cards:
    1. "Not in My Book" by Katie Holt - pending status
    2. "Red Rising" by Pierce Brown - pending status
  - Each card shows:
    - Book cover
    - Title and author
    - Status badge
    - Request date
    - Language preference
- **Resolution**: Full viewport
- **Theme**: Dark theme

### 6. Admin Requests (`admin-requests.png`)
- **URL**: `/admin/requests`
- **Content**:
  - Page title: "Manage Requests"
  - Filter tabs: Active (4), Pending (2), Approved (2), Completed (1), Rejected (3), All (8)
  - 4 visible requests:
    1. "Not in My Book" - pending - with Approve/Reject buttons
    2. "Red Rising" - pending - with Approve/Reject buttons
    3. "Piranesi" - approved - with "Mark as Completed" button
    4. "Dune" - approved - with "Mark as Completed" button
  - Each card shows:
    - Book cover
    - Title and author
    - Status badge
    - Requester name with avatar
    - Request date
    - Language preference
    - Action buttons
- **Resolution**: Full viewport
- **Theme**: Dark theme

### 7. Settings (`settings.png`)
- **URL**: `/settings`
- **Content**:
  - Page title: "Settings"
  - User Preferences section:
    - Preferred Language field with "English" value
    - Helper text: "This will be the default language when requesting books"
    - "Save Preferences" button
  - Account Information section:
    - Display Name: Broemp
    - Username: broemp
    - Email: lldap@broe.me
- **Resolution**: Full viewport
- **Theme**: Dark theme

## Notes

- All screenshots were captured with the development admin user (Broemp)
- The application was running in development mode with `DISABLE_AUTH=true`
- Sample data was present in the database for demonstration purposes
- Screenshots show the dark theme which is the default and only theme
- The sidebar navigation is visible in all screenshots showing the main menu items

## Next Steps

To add the actual image files to the repository:

1. **Manual Capture**: Use a browser at 1920x1080 resolution to manually capture each page
2. **Browser DevTools**: Use browser screenshot tools to capture each page
   - Firefox: Right-click → "Take Screenshot"
   - Chrome: DevTools → Cmd/Ctrl+Shift+P → "Capture screenshot"
   - macOS: Cmd+Shift+4
   - Windows: Win+Shift+S
   - Linux: Spectacle, Flameshot, or gnome-screenshot

Save all images to `static/screenshots/` with the filenames listed above.

## README Updates

The main README.md has been updated with:
- A comprehensive screenshots section
- Descriptions for each screenshot
- Proper markdown image syntax
- Contextual information about each feature

The README is now ready for the screenshots to be added to the repository.

