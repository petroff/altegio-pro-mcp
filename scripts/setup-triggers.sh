#!/bin/bash
# Setup Cloud Build triggers for multi-environment deployment
# Usage: ./scripts/setup-triggers.sh

set -e

PROJECT_ID="altegio-mcp"
REPO_OWNER="petroff"
REPO_NAME="altegio-pro-mcp"
REGION="europe-west1"

echo "================================================"
echo "Setting up Cloud Build Triggers"
echo "Project: $PROJECT_ID"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo "================================================"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
  echo "Error: Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

echo ""
echo "Step 1/4: Checking existing triggers..."

# Delete old triggers if they exist
EXISTING_TRIGGERS=$(gcloud builds triggers list --format="value(name)" 2>/dev/null || true)

if echo "$EXISTING_TRIGGERS" | grep -q "altegio-mcp-production"; then
  echo "Deleting old production trigger..."
  gcloud builds triggers delete altegio-mcp-production --quiet 2>/dev/null || true
fi

if echo "$EXISTING_TRIGGERS" | grep -q "altegio-mcp-staging"; then
  echo "Deleting old staging trigger..."
  gcloud builds triggers delete altegio-mcp-staging --quiet 2>/dev/null || true
fi

echo ""
echo "Step 2/4: Creating PRODUCTION trigger (main branch)..."

gcloud builds triggers create github \
  --name="altegio-mcp-production" \
  --description="Deploy to production on push to main branch" \
  --repo-name="$REPO_NAME" \
  --repo-owner="$REPO_OWNER" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region="$REGION" \
  --substitutions="_REGION=$REGION"

echo "✅ Production trigger created"

echo ""
echo "Step 3/4: Creating STAGING trigger (all other branches)..."

gcloud builds triggers create github \
  --name="altegio-mcp-staging" \
  --description="Deploy to staging on push to any branch except main" \
  --repo-name="$REPO_NAME" \
  --repo-owner="$REPO_OWNER" \
  --branch-pattern="^(?!main$).*" \
  --build-config="cloudbuild-staging.yaml" \
  --region="$REGION" \
  --substitutions="_REGION=$REGION"

echo "✅ Staging trigger created"

echo ""
echo "Step 4/4: Setting up CLEANUP automation..."

# Create Cloud Scheduler job for cleanup
if gcloud scheduler jobs describe staging-cleanup --location=$REGION &>/dev/null; then
  echo "Updating existing cleanup job..."
  gcloud scheduler jobs update http staging-cleanup \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --time-zone="UTC" \
    --uri="https://cloudbuild.googleapis.com/v1/projects/$PROJECT_ID/triggers/altegio-mcp-cleanup:run" \
    --http-method=POST \
    --oidc-service-account-email="$PROJECT_ID@appspot.gserviceaccount.com" \
    --quiet || echo "Warning: Failed to update cleanup job"
else
  echo "Creating cleanup job..."
  gcloud scheduler jobs create http staging-cleanup \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --time-zone="UTC" \
    --uri="https://cloudbuild.googleapis.com/v1/projects/$PROJECT_ID/triggers/altegio-mcp-cleanup:run" \
    --http-method=POST \
    --oidc-service-account-email="$PROJECT_ID@appspot.gserviceaccount.com" \
    --quiet || echo "Warning: Failed to create cleanup job"
fi

echo ""
echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Triggers created:"
echo "  1. altegio-mcp-production (main branch)"
echo "  2. altegio-mcp-staging (all other branches)"
echo ""
echo "Next steps:"
echo "  1. Push to any branch to test staging deployment"
echo "  2. Merge to main to test production deployment"
echo "  3. Check triggers: gcloud builds triggers list"
echo ""
echo "Cleanup:"
echo "  - Runs daily at 2 AM UTC"
echo "  - Deletes staging services older than 3 days"
echo ""
