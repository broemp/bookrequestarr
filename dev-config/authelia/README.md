# Authelia Configuration for Development

This directory contains the Authelia configuration files for the Bookrequestarr development environment.

## Files

- **`configuration.yml`**: Main Authelia configuration file with OIDC provider settings
- **`users_database.yml`**: Test users with pre-configured passwords and group memberships
- **`generate-passwords.sh`**: Helper script to generate new Argon2id password hashes

## Test Users

The following test users are pre-configured:

| Username     | Password   | Groups                                   | Description               |
| ------------ | ---------- | ---------------------------------------- | ------------------------- |
| `admin`      | `admin123` | `bookrequestarr`, `bookrequestarr_admin` | Full admin access         |
| `user`       | `user123`  | `bookrequestarr`                         | Regular user access       |
| `testuser`   | `test123`  | `bookrequestarr`                         | Additional test user      |
| `superadmin` | `super123` | `bookrequestarr`, `bookrequestarr_admin` | Alternative admin account |

## Configuration Placeholders

The `configuration.yml` file contains several placeholders that will be automatically replaced by the setup script:

- `JWT_SECRET_PLACEHOLDER` - JWT secret for session tokens
- `SESSION_SECRET_PLACEHOLDER` - Session encryption secret
- `ENCRYPTION_KEY_PLACEHOLDER` - Storage encryption key
- `OIDC_HMAC_SECRET_PLACEHOLDER` - OIDC HMAC secret
- `ISSUER_PRIVATE_KEY_PLACEHOLDER` - RSA private key for OIDC token signing
- `BOOKREQUESTARR_CLIENT_SECRET_PLACEHOLDER` - OIDC client secret for Bookrequestarr

These placeholders will be replaced when you run the `dev-setup.sh` script.

## OIDC Client Configuration

The Authelia instance is configured with an OIDC client for Bookrequestarr:

- **Client ID**: `bookrequestarr`
- **Client Secret**: Generated during setup
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **Scopes**: `openid`, `profile`, `email`, `groups`
- **Grant Types**: `authorization_code`, `refresh_token`

## Group-Based Authorization

Bookrequestarr uses group membership for authorization:

- **`bookrequestarr`**: Required for basic access to the application
- **`bookrequestarr_admin`**: Required for admin features (user management, settings, etc.)

Users must be a member of at least the `bookrequestarr` group to log in.

## Generating New Password Hashes

If you need to add new users or change passwords:

### Option 1: Using Docker (Recommended)

```bash
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate argon2 --password YOUR_PASSWORD
```

### Option 2: Using the Helper Script

```bash
./generate-passwords.sh
```

This will generate hashes for all default passwords. Copy the output to `users_database.yml`.

### Option 3: Manual Generation

If you have the `argon2` CLI tool installed:

```bash
echo -n "YOUR_PASSWORD" | argon2 somesalt -id -t 1 -m 16 -p 8 -l 32
```

## Session Storage

Authelia uses Redis for session storage in the development environment. The Redis instance is automatically started by `docker-compose.dev.yml`.

## Access Control

The configuration allows all authenticated users (one-factor authentication) to access:

- `localhost` domain
- `*.localhost` subdomains

This is suitable for development but should be tightened for production use.

## Notifications

In the development environment, Authelia uses file-based notifications instead of email. Notification messages are written to `/config/notification.txt` inside the container.

## Storage

Authelia uses SQLite for storage in development:

- Database file: `/config/db.sqlite3` (mapped to `dev-data/authelia/db.sqlite3`)
- Encryption key: Generated during setup

## Debugging

The log level is set to `debug` for development. You can view Authelia logs with:

```bash
docker compose -f docker-compose.dev.yml logs -f authelia
```

## Security Notes

⚠️ **This configuration is for DEVELOPMENT ONLY!**

- Passwords are simple and well-known
- Secrets are stored in plain text
- TLS is disabled
- Debug logging is enabled
- No rate limiting on authentication attempts

**Never use this configuration in production!**

## Customization

To customize the configuration:

1. Edit `configuration.yml` for Authelia settings
2. Edit `users_database.yml` to add/modify users
3. Restart the Authelia container:
   ```bash
   docker compose -f docker-compose.dev.yml restart authelia
   ```

## Troubleshooting

### Authentication Fails

1. Check that the user exists in `users_database.yml`
2. Verify the user is a member of the `bookrequestarr` group
3. Check Authelia logs for errors
4. Ensure Redis is running: `docker compose -f docker-compose.dev.yml ps redis`

### OIDC Errors

1. Verify the client secret matches in both Authelia config and Bookrequestarr `.env`
2. Check the redirect URI is correct (`http://localhost:3000/auth/callback`)
3. Ensure all secrets have been generated (run `dev-setup.sh` if not)

### Session Issues

1. Check Redis is running and accessible
2. Verify the session secret is set correctly
3. Clear browser cookies and try again

## References

- [Authelia Documentation](https://www.authelia.com/docs/)
- [OIDC Configuration](https://www.authelia.com/configuration/identity-providers/oidc/)
- [File-based Authentication Backend](https://www.authelia.com/configuration/first-factor/file/)
