#!/bin/bash

# ================================
# CR System Docker Helper Scripts
# ================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    echo -e "${2}${1}${NC}"
}

# Help message
show_help() {
    echo ""
    echo "CR System Docker Helper"
    echo "========================"
    echo ""
    echo "Usage: ./docker.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev           Start development environment"
    echo "  dev:build     Build and start development environment"
    echo "  dev:down      Stop development environment"
    echo "  prod          Start production environment"
    echo "  prod:build    Build and start production environment"
    echo "  prod:down     Stop production environment"
    echo "  logs          View API container logs"
    echo "  migrate       Run database migrations"
    echo "  seed          Seed the database"
    echo "  shell         Open shell in api container"
    echo "  clean         Remove all containers, volumes, and images"
    echo "  help          Show this help message"
    echo ""
    echo "Note: Database is external. Configure DATABASE_URL in .env.docker"
    echo ""
}

# Check if docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_msg "Error: Docker is not running. Please start Docker first." "$RED"
        exit 1
    fi
}

# Development commands
dev() {
    check_docker
    print_msg "Starting development environment..." "$BLUE"
    print_msg "Note: Make sure your external PostgreSQL is running!" "$YELLOW"
    docker compose -f docker-compose.dev.yml up -d
    print_msg "Development environment started!" "$GREEN"
    print_msg "API: http://localhost:3000" "$YELLOW"
    print_msg "API Docs: http://localhost:3000/api-docs" "$YELLOW"
}

dev_build() {
    check_docker
    print_msg "Building and starting development environment..." "$BLUE"
    docker compose -f docker-compose.dev.yml up -d --build
    print_msg "Development environment started!" "$GREEN"
}

dev_down() {
    check_docker
    print_msg "Stopping development environment..." "$BLUE"
    docker compose -f docker-compose.dev.yml down
    print_msg "Development environment stopped!" "$GREEN"
}

# Production commands
prod() {
    check_docker
    print_msg "Starting production environment..." "$BLUE"
    print_msg "Note: Make sure your external PostgreSQL is running!" "$YELLOW"
    docker compose -f docker-compose.yml up -d
    print_msg "Production environment started!" "$GREEN"
    print_msg "API: http://localhost:3000" "$YELLOW"
    print_msg "API Docs: http://localhost:3000/api-docs" "$YELLOW"
}

prod_build() {
    check_docker
    print_msg "Building and starting production environment..." "$BLUE"
    docker compose -f docker-compose.yml up -d --build
    print_msg "Production environment started!" "$GREEN"
}

prod_down() {
    check_docker
    print_msg "Stopping production environment..." "$BLUE"
    docker compose -f docker-compose.yml down
    print_msg "Production environment stopped!" "$GREEN"
}

# Logs
logs() {
    check_docker
    docker compose -f docker-compose.dev.yml logs -f api
}

# Database commands (runs inside container, connects to external DB)
migrate() {
    check_docker
    print_msg "Running database migrations..." "$BLUE"
    docker compose -f docker-compose.dev.yml exec api npx prisma migrate deploy
    print_msg "Migrations completed!" "$GREEN"
}

seed() {
    check_docker
    print_msg "Seeding database..." "$BLUE"
    docker compose -f docker-compose.dev.yml exec api npm run seed
    print_msg "Database seeded!" "$GREEN"
}

# Shell access
shell() {
    check_docker
    docker compose -f docker-compose.dev.yml exec api sh
}

# Cleanup
clean() {
    check_docker
    print_msg "WARNING: This will remove all containers, volumes, and images!" "$RED"
    read -p "Are you sure? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        print_msg "Cleaning up..." "$BLUE"
        docker compose -f docker-compose.yml down -v --rmi all 2>/dev/null || true
        docker compose -f docker-compose.dev.yml down -v --rmi all 2>/dev/null || true
        print_msg "Cleanup completed!" "$GREEN"
    else
        print_msg "Cleanup cancelled." "$YELLOW"
    fi
}

# Main command handler
case "$1" in
    dev)
        dev
        ;;
    dev:build)
        dev_build
        ;;
    dev:down)
        dev_down
        ;;
    prod)
        prod
        ;;
    prod:build)
        prod_build
        ;;
    prod:down)
        prod_down
        ;;
    logs)
        logs
        ;;
    migrate)
        migrate
        ;;
    seed)
        seed
        ;;
    shell)
        shell
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        ;;
esac
