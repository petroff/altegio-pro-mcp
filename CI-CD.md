# CI/CD Setup

Automated deployment pipeline for Altegio.Pro MCP Server.

## Overview

- **Push to `main`** → Triggers Cloud Build
- **Cloud Build** → Builds Docker image, pushes to Artifact Registry
- **Cloud Run** → Automatically deploys new image to staging

## Architecture

```
GitHub (main branch)
    ↓ push
Cloud Build Trigger
    ↓ cloudbuild.yaml
Docker Build → Artifact Registry
    ↓
Cloud Run Deployment
```

## Setup

### Prerequisites

- Google Cloud Project with Cloud Build enabled
- GitHub repo connected to Cloud Build
- Secret Manager secret for API token
- Artifact Registry repository for Docker images

### Initial Setup (One-time)

Already configured for this project. For new projects:

```bash
# 1. Set project
gcloud config set project YOUR_PROJECT_ID

# 2. Enable APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# 3. Create Artifact Registry
gcloud artifacts repositories create altegio-mcp \
  --repository-format=docker \
  --location=us-central1

# 4. Create secret
echo -n "YOUR_ALTEGIO_TOKEN" | \
  gcloud secrets create altegio-api-token --data-file=-

# 5. Grant Cloud Build permissions
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin \
  --condition=None

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --condition=None

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser \
  --condition=None

# 6. Connect GitHub (via Cloud Console)
# Go to: https://console.cloud.google.com/cloud-build/triggers/connect
# Connect your GitHub repository
# Create trigger pointing to cloudbuild.yaml
```

## Deployment Flow

### Automatic Deployment (Main Branch)

```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

This automatically:
1. Triggers Cloud Build
2. Builds Docker image with tag `$SHORT_SHA` and `latest`
3. Pushes to Artifact Registry
4. Deploys to Cloud Run staging
5. Service URL remains stable

### Manual Deployment

```bash
# Submit build manually
gcloud builds submit --config cloudbuild.yaml
```

## Local Testing

### Build and Run Docker Locally

```bash
# Build image
docker build -t altegio-mcp:local .

# Run with .env file
docker run --rm -d \
  --name altegio-mcp-local \
  -p 8080:8080 \
  --env-file .env \
  -e PORT=8080 \
  altegio-mcp:local

# Test
curl http://localhost:8080/health

# Stop
docker stop altegio-mcp-local
```

### Using Docker Compose

```bash
# Start
docker-compose -f docker-compose.local.yml up -d

# Logs
docker-compose -f docker-compose.local.yml logs -f

# Stop
docker-compose -f docker-compose.local.yml down
```

### Local Build (No Docker)

```bash
# Build TypeScript
npm run build

# Run with .env
npm start
```

## Environment Variables

### For Local Development

Create `.env` file (not committed):

```bash
ALTEGIO_API_TOKEN=your_partner_token_here
ALTEGIO_API_BASE=https://api.alteg.io/api/v1
NODE_ENV=development
LOG_LEVEL=info
```

### For Cloud Run

Managed via:
- **Secrets**: `ALTEGIO_API_TOKEN` from Secret Manager
- **Env vars**: Set in `cloudbuild.yaml` deploy step

## Monitoring

### Build Status

```bash
# List recent builds
gcloud builds list --limit=5

# Get build logs
gcloud builds log BUILD_ID
```

### Service Status

```bash
# Service info
gcloud run services describe YOUR_SERVICE_NAME --region=REGION

# Recent logs
gcloud run services logs read YOUR_SERVICE_NAME --region=REGION --limit=50

# Health check
curl https://your-service-name.run.app/health
```

## Troubleshooting

### Build Failures

```bash
# Check build logs
gcloud builds list --limit=1 --format="value(id)"
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

### Deployment Failures

```bash
# Check Cloud Run logs
gcloud run services logs read YOUR_SERVICE_NAME \
  --region=REGION \
  --limit=100
```

### Secret Access Issues

```bash
# Verify secret exists
gcloud secrets describe altegio-api-token

# Check Cloud Build has access
gcloud secrets get-iam-policy altegio-api-token
```

## Security Notes

- **Never commit** `.env` files
- **Secret Manager** stores API tokens securely
- **IAM permissions** limit access to Cloud Build service account
- **Service URL** is public but requires valid credentials for operations

## Updating Secrets

```bash
# Update API token
echo -n "NEW_TOKEN" | gcloud secrets versions add YOUR_SECRET_NAME --data-file=-

# Redeploy service to use new secret
gcloud run services update YOUR_SERVICE_NAME \
  --region=REGION \
  --update-secrets=ALTEGIO_API_TOKEN=YOUR_SECRET_NAME:latest
```

## Production Deployment

To create production environment:

1. Create new Cloud Run service with production name
2. Add condition to trigger: `--branch-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$"` (tags)
3. Update `cloudbuild.yaml` with production service name
4. Use separate secret for production token

---

**Deployment:** Auto-deploy on push to `main` via Cloud Build trigger
