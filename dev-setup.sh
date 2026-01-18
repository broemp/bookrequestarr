#!/bin/bash

###############################################################
#         Bookrequestarr Development Setup Script            #
###############################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Generate secure random string
generate_secret() {
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-${1:-64}
}

# Create directory structure
create_directories() {
    print_header "Creating Directory Structure"
    
    mkdir -p dev-data/app
    mkdir -p dev-data/authelia
    mkdir -p dev-data/redis
    mkdir -p dev-data/prowlarr
    mkdir -p dev-data/sabnzbd
    mkdir -p dev-data/downloads
    
    print_success "Created dev-data/ directory structure"
}

# Generate Authelia secrets
generate_authelia_secrets() {
    print_header "Generating Authelia Secrets"
    
    # Generate secrets
    JWT_SECRET=$(generate_secret 64)
    SESSION_SECRET=$(generate_secret 64)
    ENCRYPTION_KEY=$(generate_secret 64)
    OIDC_HMAC_SECRET=$(generate_secret 64)
    BOOKREQUESTARR_CLIENT_SECRET=$(generate_secret 48)
    
    print_success "Generated JWT secret"
    print_success "Generated session secret"
    print_success "Generated encryption key"
    print_success "Generated OIDC HMAC secret"
    print_success "Generated Bookrequestarr client secret"
    
    # Generate RSA key pair for OIDC
    print_info "Generating RSA key pair for OIDC..."
    ISSUER_PRIVATE_KEY=$(openssl genrsa 4096 2>/dev/null | sed '1d;$d' | tr -d '\n')
    print_success "Generated RSA private key"
    
    # Copy Authelia configuration and replace placeholders
    print_info "Configuring Authelia..."
    cp dev-config/authelia/configuration.yml dev-data/authelia/configuration.yml
    
    # Replace placeholders in configuration
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET_PLACEHOLDER/$JWT_SECRET/g" dev-data/authelia/configuration.yml
        sed -i '' "s/SESSION_SECRET_PLACEHOLDER/$SESSION_SECRET/g" dev-data/authelia/configuration.yml
        sed -i '' "s/ENCRYPTION_KEY_PLACEHOLDER/$ENCRYPTION_KEY/g" dev-data/authelia/configuration.yml
        sed -i '' "s/OIDC_HMAC_SECRET_PLACEHOLDER/$OIDC_HMAC_SECRET/g" dev-data/authelia/configuration.yml
        sed -i '' "s/BOOKREQUESTARR_CLIENT_SECRET_PLACEHOLDER/$BOOKREQUESTARR_CLIENT_SECRET/g" dev-data/authelia/configuration.yml
        sed -i '' "s|ISSUER_PRIVATE_KEY_PLACEHOLDER|$ISSUER_PRIVATE_KEY|g" dev-data/authelia/configuration.yml
    else
        # Linux
        sed -i "s/JWT_SECRET_PLACEHOLDER/$JWT_SECRET/g" dev-data/authelia/configuration.yml
        sed -i "s/SESSION_SECRET_PLACEHOLDER/$SESSION_SECRET/g" dev-data/authelia/configuration.yml
        sed -i "s/ENCRYPTION_KEY_PLACEHOLDER/$ENCRYPTION_KEY/g" dev-data/authelia/configuration.yml
        sed -i "s/OIDC_HMAC_SECRET_PLACEHOLDER/$OIDC_HMAC_SECRET/g" dev-data/authelia/configuration.yml
        sed -i "s/BOOKREQUESTARR_CLIENT_SECRET_PLACEHOLDER/$BOOKREQUESTARR_CLIENT_SECRET/g" dev-data/authelia/configuration.yml
        sed -i "s|ISSUER_PRIVATE_KEY_PLACEHOLDER|$ISSUER_PRIVATE_KEY|g" dev-data/authelia/configuration.yml
    fi
    
    print_success "Configured Authelia with generated secrets"
    
    # Create users database
    print_info "Creating test users..."
    cat > dev-data/authelia/users_database.yml <<EOF
---
###############################################################
#                   Authelia Users Database                   #
#                  Development Environment                    #
###############################################################

users:
  admin:
    displayname: "Admin User"
    password: "\$argon2id\$v=19\$m=65536,t=3,p=4\$BpLnfgDsc2WD8F2q\$o/vzA4myCqZZ36bUGsDY//8mKUYNZZaR0t4MFFSs+iM"  # admin123
    email: admin@localhost
    groups:
      - bookrequestarr
      - bookrequestarr_admin
  
  user:
    displayname: "Regular User"
    password: "\$argon2id\$v=19\$m=65536,t=3,p=4\$BpLnfgDsc2WD8F2q\$o/vzA4myCqZZ36bUGsDY//8mKUYNZZaR0t4MFFSs+iM"  # user123
    email: user@localhost
    groups:
      - bookrequestarr
EOF
    
    print_success "Created test users (admin/admin123, user/user123)"
    
    # Export secrets for .env file
    export BOOKREQUESTARR_CLIENT_SECRET
    export JWT_SECRET
}

# Create .env file
create_env_file() {
    print_header "Creating .env File"
    
    if [ -f .env ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return
        fi
    fi
    
    # Copy template and replace placeholders
    cp env.dev.template .env
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/BOOKREQUESTARR_CLIENT_SECRET_PLACEHOLDER/$BOOKREQUESTARR_CLIENT_SECRET/g" .env
        sed -i '' "s/JWT_SECRET_PLACEHOLDER/$JWT_SECRET/g" .env
    else
        # Linux
        sed -i "s/BOOKREQUESTARR_CLIENT_SECRET_PLACEHOLDER/$BOOKREQUESTARR_CLIENT_SECRET/g" .env
        sed -i "s/JWT_SECRET_PLACEHOLDER/$JWT_SECRET/g" .env
    fi
    
    print_success "Created .env file from template"
    print_warning "Don't forget to add your HARDCOVER_API_KEY to .env!"
}

# Start Docker containers
start_containers() {
    print_header "Starting Docker Containers"
    
    if [ ! -f docker-compose.dev.yml ]; then
        print_error "docker-compose.dev.yml not found!"
        print_info "Please ensure the docker-compose.dev.yml file exists in the project root"
        exit 1
    fi
    
    print_info "Starting containers with docker compose..."
    docker compose -f docker-compose.dev.yml up -d
    
    print_success "All containers started successfully"
}

# Display access information
display_info() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}Development environment is ready!${NC}\n"
    
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "  • Bookrequestarr: ${GREEN}http://localhost:3000${NC}"
    echo -e "  • Authelia:       ${GREEN}http://localhost:9091${NC}"
    echo -e "  • Prowlarr:       ${GREEN}http://localhost:9696${NC}"
    echo -e "  • SABnzbd:        ${GREEN}http://localhost:8080${NC}"
    
    echo -e "\n${BLUE}Test Credentials:${NC}"
    echo -e "  • Admin:  username=${GREEN}admin${NC}  password=${GREEN}admin123${NC}"
    echo -e "  • User:   username=${GREEN}user${NC}   password=${GREEN}user123${NC}"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "  1. Add your ${GREEN}HARDCOVER_API_KEY${NC} to the .env file"
    echo -e "  2. Configure Prowlarr at ${GREEN}http://localhost:9696${NC}"
    echo -e "     - Add indexers"
    echo -e "     - Copy API key from Settings → General → Security"
    echo -e "     - Add API key to .env as ${GREEN}PROWLARR_API_KEY${NC}"
    echo -e "  3. Configure SABnzbd at ${GREEN}http://localhost:8080${NC}"
    echo -e "     - Complete initial setup wizard"
    echo -e "     - Create 'books' category"
    echo -e "     - Copy API key from Config → General → Security"
    echo -e "     - Add API key to .env as ${GREEN}SABNZBD_API_KEY${NC}"
    echo -e "  4. Restart Bookrequestarr: ${GREEN}docker compose -f docker-compose.dev.yml restart bookrequestarr${NC}"
    echo -e "  5. Access Bookrequestarr at ${GREEN}http://localhost:3000${NC}"
    
    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo -e "  • View logs:        ${GREEN}docker compose -f docker-compose.dev.yml logs -f${NC}"
    echo -e "  • Stop containers:  ${GREEN}docker compose -f docker-compose.dev.yml down${NC}"
    echo -e "  • Restart app:      ${GREEN}docker compose -f docker-compose.dev.yml restart bookrequestarr${NC}"
    echo -e "  • Clean everything: ${GREEN}docker compose -f docker-compose.dev.yml down -v && rm -rf dev-data${NC}"
    
    echo -e "\n${BLUE}Documentation:${NC}"
    echo -e "  • See ${GREEN}docs/DEV_DOCKER_SETUP.md${NC} for detailed instructions"
    
    echo ""
}

# Main execution
main() {
    print_header "Bookrequestarr Development Setup"
    
    check_docker
    create_directories
    generate_authelia_secrets
    create_env_file
    start_containers
    display_info
}

# Run main function
main
