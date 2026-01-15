#!/bin/bash

# OIDC Configuration Checker for Authelia
# This script helps diagnose OIDC configuration issues

echo "==================================="
echo "OIDC Configuration Checker"
echo "==================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

echo "📋 Current Configuration:"
echo "  OIDC_ISSUER: $OIDC_ISSUER"
echo "  OIDC_CLIENT_ID: $OIDC_CLIENT_ID"
echo "  OIDC_REDIRECT_URI: $OIDC_REDIRECT_URI"
echo "  OIDC_USER_GROUP: $OIDC_USER_GROUP"
echo "  OIDC_ADMIN_GROUP: $OIDC_ADMIN_GROUP"
echo ""

echo "🔍 Checking OIDC Discovery Endpoint..."
DISCOVERY_URL="${OIDC_ISSUER}/.well-known/openid-configuration"
echo "  URL: $DISCOVERY_URL"
echo ""

if command -v curl &> /dev/null; then
    echo "📡 Fetching OIDC configuration..."
    RESPONSE=$(curl -s "$DISCOVERY_URL")
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully fetched OIDC configuration"
        echo ""
        
        # Extract key endpoints
        AUTH_ENDPOINT=$(echo "$RESPONSE" | grep -o '"authorization_endpoint":"[^"]*"' | cut -d'"' -f4)
        TOKEN_ENDPOINT=$(echo "$RESPONSE" | grep -o '"token_endpoint":"[^"]*"' | cut -d'"' -f4)
        USERINFO_ENDPOINT=$(echo "$RESPONSE" | grep -o '"userinfo_endpoint":"[^"]*"' | cut -d'"' -f4)
        
        echo "📍 Discovered Endpoints:"
        echo "  Authorization: $AUTH_ENDPOINT"
        echo "  Token: $TOKEN_ENDPOINT"
        echo "  UserInfo: $USERINFO_ENDPOINT"
        echo ""
        
        # Check if our hardcoded endpoints match
        EXPECTED_AUTH="${OIDC_ISSUER}/api/oidc/authorization"
        EXPECTED_TOKEN="${OIDC_ISSUER}/api/oidc/token"
        EXPECTED_USERINFO="${OIDC_ISSUER}/api/oidc/userinfo"
        
        echo "🔎 Endpoint Validation:"
        if [ "$AUTH_ENDPOINT" = "$EXPECTED_AUTH" ]; then
            echo "  ✅ Authorization endpoint matches"
        else
            echo "  ⚠️  Authorization endpoint mismatch!"
            echo "      Expected: $EXPECTED_AUTH"
            echo "      Got: $AUTH_ENDPOINT"
        fi
        
        if [ "$TOKEN_ENDPOINT" = "$EXPECTED_TOKEN" ]; then
            echo "  ✅ Token endpoint matches"
        else
            echo "  ⚠️  Token endpoint mismatch!"
            echo "      Expected: $EXPECTED_TOKEN"
            echo "      Got: $TOKEN_ENDPOINT"
        fi
        
        if [ "$USERINFO_ENDPOINT" = "$EXPECTED_USERINFO" ]; then
            echo "  ✅ UserInfo endpoint matches"
        else
            echo "  ⚠️  UserInfo endpoint mismatch!"
            echo "      Expected: $EXPECTED_USERINFO"
            echo "      Got: $USERINFO_ENDPOINT"
        fi
        echo ""
        
        # Check supported auth methods
        TOKEN_AUTH_METHODS=$(echo "$RESPONSE" | grep -o '"token_endpoint_auth_methods_supported":\[[^]]*\]' | cut -d'[' -f2 | cut -d']' -f1)
        echo "🔐 Supported Token Endpoint Auth Methods:"
        echo "  $TOKEN_AUTH_METHODS"
        echo ""
        
    else
        echo "❌ Failed to fetch OIDC configuration"
        echo "   Make sure Authelia is running and accessible"
    fi
else
    echo "⚠️  curl not found, skipping endpoint checks"
fi

echo ""
echo "==================================="
echo "⚠️  Common Issues to Check:"
echo "==================================="
echo ""
echo "1. Redirect URI Configuration:"
echo "   • In Authelia config, the redirect_uris must include:"
echo "     $OIDC_REDIRECT_URI"
echo ""
echo "2. Client Authentication Method:"
echo "   • Check your Authelia client config for 'token_endpoint_auth_method'"
echo "   • It should be set to 'client_secret_basic' (default) or 'client_secret_post'"
echo "   • Our app uses 'client_secret_basic' (HTTP Basic Auth)"
echo ""
echo "3. PKCE Configuration:"
echo "   • Ensure PKCE is enabled in Authelia (it should be by default)"
echo "   • Check that 'public' is set to false in your client config"
echo ""
echo "4. Scopes:"
echo "   • Make sure these scopes are allowed: openid, profile, email, groups"
echo ""
echo "5. Group Membership:"
echo "   • Your user must be in one of these groups:"
echo "     - $OIDC_USER_GROUP"
echo "     - $OIDC_ADMIN_GROUP"
echo ""
echo "==================================="
echo "📝 Example Authelia Client Config:"
echo "==================================="
echo ""
cat << 'EOF'
identity_providers:
  oidc:
    clients:
      - id: bookrequestarr
        description: Bookrequestarr
        secret: YOUR_CLIENT_SECRET_HASH
        public: false
        authorization_policy: two_factor
        redirect_uris:
          - http://localhost:5173/api/auth/callback
        scopes:
          - openid
          - profile
          - email
          - groups
        token_endpoint_auth_method: client_secret_basic
        grant_types:
          - authorization_code
          - refresh_token
        response_types:
          - code
EOF
echo ""
echo "==================================="

