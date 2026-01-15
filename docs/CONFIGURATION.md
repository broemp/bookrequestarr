# Configuration Guide

This document describes all configuration options for Bookrequestarr.

## Environment Variables

All configuration is done through environment variables. You can set these in a `.env` file for local development or pass them directly in your deployment environment.

### Database

| Variable       | Required | Default | Description                                                     |
| -------------- | -------- | ------- | --------------------------------------------------------------- |
| `DATABASE_URL` | Yes      | -       | Path to SQLite database file (e.g., `./data/bookrequestarr.db`) |

### OIDC Authentication

Bookrequestarr uses OpenID Connect (OIDC) for authentication. It supports any generic OIDC provider.

| Variable             | Required | Default                | Description                                                                    |
| -------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------ |
| `OIDC_ISSUER`        | Yes      | -                      | OIDC provider issuer URL (e.g., `https://keycloak.example.com/realms/myrealm`) |
| `OIDC_CLIENT_ID`     | Yes      | -                      | OIDC client ID                                                                 |
| `OIDC_CLIENT_SECRET` | Yes      | -                      | OIDC client secret                                                             |
| `OIDC_REDIRECT_URI`  | Yes      | -                      | Callback URL (e.g., `https://bookrequestarr.example.com/api/auth/callback`)    |
| `OIDC_ADMIN_GROUP`   | No       | `bookrequestarr_admin` | Group name for admin users                                                     |
| `OIDC_USER_GROUP`    | No       | `bookrequestarr`       | Group name for regular users                                                   |

#### OIDC Provider Setup

##### Keycloak

1. Create a new client in your Keycloak realm
2. Set **Client Protocol** to `openid-connect`
3. Set **Access Type** to `confidential`
4. Add your callback URL to **Valid Redirect URIs**: `https://your-domain.com/api/auth/callback`
5. Enable **Client Authentication**
6. In **Client Scopes**, ensure `groups` scope is included
7. Create groups named `bookrequestarr` and `bookrequestarr_admin`
8. Assign users to appropriate groups

##### Authentik

1. Create a new OAuth2/OpenID Provider
2. Set **Redirect URIs** to your callback URL
3. Create an application and link it to the provider
4. Create groups named `bookrequestarr` and `bookrequestarr_admin`
5. Assign users to groups
6. Ensure the `groups` claim is included in the token

##### Authelia

1. Add a new client to your Authelia configuration file (`configuration.yml`):

```yaml
identity_providers:
  oidc:
    clients:
      - client_id: bookrequestarr
        client_name: Bookrequestarr Book Request Manager
        client_secret: '$pbkdf2-sha512$310000$...' # your hashed secret
        public: false
        authorization_policy: two_factor
        redirect_uris:
          - https://bookrequestarr.example.com/api/auth/callback
        scopes:
          - openid
          - profile
          - email
          - groups
        grant_types:
          - authorization_code
        response_types:
          - code
        token_endpoint_auth_method: client_secret_basic
```

2. Configure your Authelia groups in the user backend
3. Set your Bookrequestarr environment variables
4. Restart Authelia to apply the changes

**Notes:**

- The `secret` in Authelia must be hashed using `authelia crypto hash generate pbkdf2`
- The `OIDC_CLIENT_SECRET` in Bookrequestarr should be the **plain text** version (not hashed)
- Ensure the `groups` scope is included in the client configuration

### Security

| Variable     | Required | Default | Description                                                                |
| ------------ | -------- | ------- | -------------------------------------------------------------------------- |
| `JWT_SECRET` | Yes      | -       | Secret key for JWT token signing. Generate with: `openssl rand -base64 32` |

### Hardcover API

Bookrequestarr uses the Hardcover API to fetch book metadata.

| Variable            | Required | Default                                | Description                                                                                         |
| ------------------- | -------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `HARDCOVER_API_KEY` | Yes      | -                                      | Your Hardcover API key. Get one at [hardcover.app/settings/api](https://hardcover.app/settings/api) |
| `HARDCOVER_API_URL` | No       | `https://api.hardcover.app/v1/graphql` | Hardcover GraphQL API endpoint                                                                      |

**Setup:**

1. Create an account on [Hardcover](https://hardcover.app)
2. Navigate to Settings → API
3. Generate a new API key
4. Copy the key and set it in your environment variables

### Notification Backends

Bookrequestarr supports multiple notification backends. Configure the ones you want to use:

#### Discord

| Variable              | Required | Default | Description                           |
| --------------------- | -------- | ------- | ------------------------------------- |
| `DISCORD_WEBHOOK_URL` | No       | -       | Discord webhook URL for notifications |

**Setup:**

1. Go to your Discord server settings
2. Navigate to **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Configure the webhook (name, channel, avatar)
5. Copy the webhook URL

#### Telegram

| Variable             | Required | Default | Description                                |
| -------------------- | -------- | ------- | ------------------------------------------ |
| `TELEGRAM_BOT_TOKEN` | No       | -       | Telegram bot token from @BotFather         |
| `TELEGRAM_CHAT_ID`   | No       | -       | Chat ID where notifications should be sent |

**Setup:**

1. Create a bot with @BotFather on Telegram
2. Copy the bot token
3. Add the bot to your group/channel
4. Get the chat ID:
   - Send a message to the bot/group
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find the `chat.id` in the response

### Anna's Archive Integration

Bookrequestarr can automatically download books from Anna's Archive when requests are approved.

| Variable                | Required | Default             | Description                                                                                                         |
| ----------------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ANNAS_ARCHIVE_DOMAIN`  | No       | `annas-archive.org` | Base domain for Anna's Archive (e.g., `annas-archive.org`, `annas-archive.se`)                                      |
| `ANNAS_ARCHIVE_API_KEY` | No       | -                   | Anna's Archive API key for fast downloads. Get one by supporting [Anna's Archive](https://annas-archive.org/donate) |
| `DOWNLOAD_DIRECTORY`    | No       | `./data/downloads`  | Directory where downloaded books will be stored (e.g., Calibre ingest folder)                                       |
| `DOWNLOAD_DAILY_LIMIT`  | No       | `25`                | Maximum number of downloads per day to respect rate limits                                                          |
| `CALIBRE_BASE_URL`      | No       | -                   | Base URL for Calibre-Web instance (e.g., `https://calibre.example.com`). Enables Calibre-Web Automated integration  |

**Setup:**

1. Support [Anna's Archive](https://annas-archive.org/donate) to get access to fast downloads
2. Obtain your API key from your Anna's Archive account
3. Set the `ANNAS_ARCHIVE_API_KEY` environment variable
4. Configure download settings in the admin settings page:
   - **Enable Anna's Archive Downloads**: Toggle to enable/disable the feature
   - **Download Directory**: Path where books will be saved (default: `./data/downloads`)
   - **Auto-Download Mode**:
     - `Disabled`: Manual downloads only via admin interface
     - `All Users`: Automatically download when any request is approved
     - `Selected Users`: Only auto-download for users with auto-download enabled
   - **Daily Download Limit**: Maximum downloads per day (default: 25)
   - **Auto-Select Best File**: Automatically choose the best file format, or prompt for manual selection
   - **Calibre Base URL**: Optional URL to link downloaded books to your Calibre web interface

**File Type Preferences:**

The downloader will search for books in the following order of preference:

1. EPUB (most compatible with e-readers)
2. PDF (universal format)
3. MOBI (Kindle format)
4. AZW3 (Kindle format)

Users can specify a preferred language when making requests, which will be used during the search.

**Download Process:**

1. When a request is approved (and auto-download is enabled), the system searches Anna's Archive
2. Search is performed by ISBN first, then falls back to title + author
3. If multiple versions are found and auto-select is disabled, admin can choose which file to download
4. Downloaded files are saved to the configured directory
5. Request status is automatically updated to "completed" on successful download
6. If download fails, status is set to "download_problem" and admin can retry

**Calibre-Web Automated Integration:**

If you use Calibre-Web Automated for managing your ebook library:

1. Set the `DOWNLOAD_DIRECTORY` to your Calibre-Web Automated ingest/import folder
2. Configure the `Calibre Base URL` in settings or via `CALIBRE_BASE_URL` environment variable (e.g., `https://calibre.example.com`)
3. Calibre-Web Automated will automatically watch the folder and import downloaded books
4. Downloaded books will be marked as "Delivered to Calibre-Web" with search links to find them in your library
5. **Optional**: Enable automatic file cleanup in settings:
   - Files older than X hours (default: 24) will be automatically removed from the download directory
   - This assumes Calibre-Web Automated has already imported the files
   - Cleanup only runs when Calibre-Web integration is enabled
   - Download records are preserved even after files are cleaned up

**Note**: The download directory acts as a transient ingest folder when Calibre-Web integration is enabled. Files are delivered to Calibre-Web Automated and can be automatically cleaned up after a configured period.

### Application

| Variable         | Required | Default       | Description                                                                          |
| ---------------- | -------- | ------------- | ------------------------------------------------------------------------------------ |
| `PUBLIC_APP_URL` | Yes      | -             | Public URL of your application (e.g., `https://bookrequestarr.example.com`)          |
| `PORT`           | No       | `3000`        | Port the application listens on                                                      |
| `NODE_ENV`       | No       | `development` | Node environment (`development` or `production`)                                     |
| `LOG_LEVEL`      | No       | `info`        | Logging level: `debug`, `info`, `warn`, or `error`                                   |
| `DISABLE_AUTH`   | No       | `false`       | **Development only**: Set to `true` to bypass authentication and auto-login as admin |

> **⚠️ Warning**: Never set `DISABLE_AUTH=true` in production! This is only for local development and testing.

## Reverse Proxy Configuration

### Traefik

```yaml
services:
  bookrequestarr:
    image: ghcr.io/broemp/bookrequestarr:latest
    container_name: bookrequestarr
    restart: unless-stopped
    environment:
      - PUBLIC_APP_URL=https://bookrequestarr.example.com
    volumes:
      - ./data:/app/data
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.bookrequestarr.rule=Host(`bookrequestarr.example.com`)'
      - 'traefik.http.routers.bookrequestarr.entrypoints=websecure'
      - 'traefik.http.routers.bookrequestarr.tls.certresolver=letsencrypt'
      - 'traefik.http.services.bookrequestarr.loadbalancer.server.port=3000'
    networks:
      - traefik

networks:
  traefik:
    external: true
```

### Nginx

```nginx
server {
    listen 80;
    server_name bookrequestarr.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bookrequestarr.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy

```caddyfile
bookrequestarr.example.com {
    reverse_proxy localhost:3000
}
```

## Troubleshooting

### Authentication Issues

- **"Unauthorized" error**: Check that your user is in the correct OIDC group
- **"Invalid state" error**: Ensure cookies are enabled and `PUBLIC_APP_URL` matches your actual URL
- **Redirect loop**: Verify `OIDC_REDIRECT_URI` is correctly configured in both your OIDC provider and environment variables

### Notification Issues

- **Notifications not sending**: Test notifications from the admin settings page
- **Discord webhook fails**: Verify the webhook URL is correct and the webhook hasn't been deleted
- **Telegram bot fails**: Ensure the bot token is correct and the bot has been added to the chat

### Database Issues

- **"DATABASE_URL is not set"**: Ensure the environment variable is set
- **Permission denied**: Check that the application has write permissions to the database directory
- **Database locked**: SQLite doesn't support multiple concurrent writers; ensure only one instance is running

## Security Considerations

1. **Always use HTTPS in production** - Set `PUBLIC_APP_URL` to use `https://`
2. **Keep JWT_SECRET secure** - Never commit it to version control
3. **Use strong OIDC client secrets** - Generate them securely from your OIDC provider
4. **Regularly update dependencies** - Run `npm audit` and update packages
5. **Backup your database** - Regularly backup the SQLite database file
6. **Restrict admin access** - Only add trusted users to the admin group
