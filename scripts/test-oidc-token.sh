#!/bin/bash

# Test OIDC Token Endpoint
# This script tests if the client credentials are valid

echo "==================================="
echo "OIDC Token Endpoint Tester"
echo "==================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

echo "📋 Testing with:"
echo "  Client ID: $OIDC_CLIENT_ID"
echo "  Token Endpoint: ${OIDC_ISSUER}/api/oidc/token"
echo ""

# Create Basic Auth header
AUTH_HEADER=$(echo -n "${OIDC_CLIENT_ID}:${OIDC_CLIENT_SECRET}" | base64)

echo "🔐 Testing client credentials with invalid grant (to verify auth)..."
echo ""

# Try to get a token with an invalid grant type to test authentication
# If authentication fails, we'll get "invalid_client"
# If authentication succeeds but grant is wrong, we'll get "unsupported_grant_type" or similar
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "${OIDC_ISSUER}/api/oidc/token" \
    -H "Authorization: Basic ${AUTH_HEADER}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "📡 Response:"
echo "  Status: $HTTP_STATUS"
echo "  Body: $BODY"
echo ""

if echo "$BODY" | grep -q "invalid_client"; then
    echo "❌ CLIENT AUTHENTICATION FAILED"
    echo ""
    echo "Possible causes:"
    echo "  1. Client ID '$OIDC_CLIENT_ID' doesn't exist in Authelia"
    echo "  2. Client secret is incorrect"
    echo "  3. Client is configured as 'public' (should be 'public: false')"
    echo ""
    echo "To fix:"
    echo "  1. Check your Authelia configuration.yml"
    echo "  2. Verify the client ID matches exactly"
    echo "  3. Generate a new client secret hash:"
    echo "     docker exec -it authelia authelia crypto hash generate pbkdf2 --password 'YOUR_SECRET'"
    echo "  4. Update the 'secret' field in Authelia config with the hash"
    echo "  5. Update OIDC_CLIENT_SECRET in .env with the plain text secret"
elif echo "$BODY" | grep -q "unsupported_grant_type\|invalid_grant"; then
    echo "✅ CLIENT AUTHENTICATION SUCCESSFUL!"
    echo ""
    echo "The client credentials are valid. The error is expected because"
    echo "we used an invalid grant type for testing purposes."
    echo ""
    echo "Your OIDC configuration should work for the authorization_code flow."
else
    echo "⚠️  Unexpected response. Please check the output above."
fi

echo ""
echo "==================================="

