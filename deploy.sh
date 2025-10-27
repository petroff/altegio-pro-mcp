#!/bin/bash
set -e

# Altegio MCP Server - Google Cloud Run Deployment Script
#
# CUSTOMIZE BEFORE USE:
# - SERVICE_NAME: Your Cloud Run service name
# - IMAGE_NAME: Your Docker image name (can be same as service)
# - REGION: Your preferred region (default: us-central1)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - CHANGE THESE VALUES
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="altegio-mcp-staging"  # CHANGE THIS
IMAGE_NAME="altegio-mcp"            # CHANGE THIS

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install from https://cloud.google.com/sdk"
        exit 1
    fi

    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install from https://docker.com"
        exit 1
    fi

    # Get project ID if not set
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            print_error "Google Cloud project not set. Run: gcloud config set project YOUR_PROJECT_ID"
            exit 1
        fi
    fi

    print_info "Using project: $PROJECT_ID"
    print_info "Using region: $REGION"
}

# Enable required APIs
enable_apis() {
    print_info "Enabling required Google Cloud APIs..."

    gcloud services enable \
        run.googleapis.com \
        secretmanager.googleapis.com \
        artifactregistry.googleapis.com \
        --project="$PROJECT_ID"
}

# Create secret in Secret Manager
create_secret() {
    print_info "Checking for ALTEGIO_API_TOKEN secret..."

    if gcloud secrets describe altegio-api-token --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Secret 'altegio-api-token' already exists. Skipping creation."
    else
        print_info "Creating secret 'altegio-api-token'..."

        if [ -z "$ALTEGIO_API_TOKEN" ]; then
            print_error "ALTEGIO_API_TOKEN environment variable not set."
            echo "Please set it:"
            echo "  export ALTEGIO_API_TOKEN='your_token_here'"
            exit 1
        fi

        echo -n "$ALTEGIO_API_TOKEN" | gcloud secrets create altegio-api-token \
            --data-file=- \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
    fi
}

# Build and deploy
deploy() {
    print_info "Starting deployment..."

    print_info "Deploying to Cloud Run from source..."

    if [ -z "$ALTEGIO_API_TOKEN" ]; then
        print_error "ALTEGIO_API_TOKEN environment variable not set."
        exit 1
    fi

    gcloud run deploy "$SERVICE_NAME" \
        --source . \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --clear-secrets \
        --set-env-vars=ALTEGIO_API_TOKEN="$ALTEGIO_API_TOKEN",LOG_LEVEL=info,NODE_ENV=production \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 10 \
        --min-instances 0 \
        --timeout 3600 \
        --no-cpu-throttling \
        --session-affinity \
        --project="$PROJECT_ID"

    print_info "Deployment complete!"
}

# Get service URL
get_url() {
    print_info "Getting service URL..."

    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --platform=managed \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format='value(status.url)' 2>/dev/null || echo "")

    if [ -n "$SERVICE_URL" ]; then
        print_info "Service deployed at: $SERVICE_URL"
        echo ""
        echo "Test endpoints:"
        echo "  Health: $SERVICE_URL/health"
        echo "  Tools:  $SERVICE_URL/tools"
        echo "  RPC:    $SERVICE_URL/rpc (POST)"
    else
        print_warning "Could not retrieve service URL. Check Cloud Console."
    fi
}

# Local build test
test_local() {
    print_info "Building Docker image locally..."
    docker build -t "$IMAGE_NAME:local" .

    print_info "Running container locally on port 8080..."
    print_warning "Press Ctrl+C to stop"

    docker run -it --rm \
        -p 8080:8080 \
        -e ALTEGIO_API_TOKEN="${ALTEGIO_API_TOKEN}" \
        -e PORT=8080 \
        "$IMAGE_NAME:local"
}

# Main execution
main() {
    echo "================================================"
    echo "   Altegio MCP Server - Cloud Run Deployment   "
    echo "================================================"
    echo ""

    case "${1:-deploy}" in
        "test")
            check_prerequisites
            test_local
            ;;
        "deploy")
            check_prerequisites
            enable_apis
            create_secret
            deploy
            get_url
            ;;
        "url")
            check_prerequisites
            get_url
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Usage: $0 [test|deploy|url]"
            echo "  test   - Build and run locally"
            echo "  deploy - Deploy to Cloud Run (default)"
            echo "  url    - Get deployed service URL"
            exit 1
            ;;
    esac
}

# Run main
main "$@"
