#!/bin/bash
# Script to generate Argon2id password hashes for Authelia test users
# Uses Authelia Docker container to generate hashes

echo "Generating Argon2id password hashes for test users..."
echo ""

# Admin user (password: admin123)
echo "Admin user (password: admin123):"
docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password admin123 --config /dev/null
echo ""

# Regular user (password: user123)
echo "Regular user (password: user123):"
docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password user123 --config /dev/null
echo ""

# Test user (password: test123)
echo "Test user (password: test123):"
docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password test123 --config /dev/null
echo ""

# Super admin (password: super123)
echo "Super admin (password: super123):"
docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password super123 --config /dev/null
echo ""

echo "Copy these hashes to dev-config/authelia/users_database.yml"
