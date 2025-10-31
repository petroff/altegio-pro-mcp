# CI/CD: Multi-Environment Deployment

Automated deployment pipeline with **production** (main) and **staging** (branches) environments.

## Architecture

### Production Environment
```
Push to main → Cloud Build → Production
Service: altegio-mcp
Region: europe-west1
Resources: 1Gi RAM, 2 CPU, min 1 instance
```

### Staging Environments
```
Push to any branch → Cloud Build → Staging
Service: altegio-mcp-{branch-name}
Region: europe-west1
Resources: 512Mi RAM, 1 CPU, scale to zero
Auto-cleanup: 3 days
```

## Quick Start

### Deploy to Staging (Any Branch)
```bash
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# → Automatic staging deployment
# → URL in build logs
```

### Deploy to Production (Main Branch)
```bash
git checkout main
git pull
git merge feature/my-feature
git push origin main
# → Automatic production deployment
```

## Deployment Flow

### 1. Staging Deployment (Feature Branches)

**Trigger:** Push to any branch except `main`

**Process:**
1. GitHub receives push
2. Cloud Build trigger fires
3. Builds Docker image with `staging-{SHA}` tag
4. Sanitizes branch name (removes /, lowercase)
5. Deploys to `altegio-mcp-{sanitized-branch}`
6. Service scales to zero when idle
7. Auto-deleted after 3 days

**Example:**
```bash
# Branch: feature/user-management
# Service: altegio-mcp-feature-user-management
# URL: https://altegio-mcp-feature-user-management-{hash}.a.run.app
```

**Config:**
- Memory: 512Mi
- CPU: 1
- Min instances: 0 (scale to zero)
- Max instances: 5
- Timeout: 3600s
- Environment: NODE_ENV=staging, LOG_LEVEL=debug

### 2. Production Deployment (Main Branch)

**Trigger:** Push to `main` branch

**Process:**
1. GitHub receives push
2. Cloud Build trigger fires
3. Builds Docker image with `production`, `latest`, and `{SHA}` tags
4. Deploys to `altegio-mcp`
5. Always-warm instance for fast response

**Config:**
- Memory: 1Gi
- CPU: 2
- Min instances: 1 (always warm)
- Max instances: 10
- Timeout: 3600s
- Environment: NODE_ENV=production, LOG_LEVEL=info

## Monitoring

### Check Build Status
```bash
# List recent builds
gcloud builds list --limit=5 --project=altegio-mcp

# Watch build logs
gcloud builds log BUILD_ID --project=altegio-mcp --stream
```

### Check Deployments
```bash
# List all services
gcloud run services list --region=europe-west1 --project=altegio-mcp

# Production service
gcloud run services describe altegio-mcp \
  --region=europe-west1 \
  --project=altegio-mcp

# Staging services
gcloud run services list \
  --region=europe-west1 \
  --filter="metadata.name:altegio-mcp-*" \
  --project=altegio-mcp
```

### Service Logs
```bash
# Production logs
gcloud run services logs read altegio-mcp \
  --region=europe-west1 \
  --limit=50 \
  --project=altegio-mcp

# Staging logs
gcloud run services logs read altegio-mcp-feature-my-feature \
  --region=europe-west1 \
  --limit=50 \
  --project=altegio-mcp
```

## Cleanup Automation

**Schedule:** Daily at 2 AM UTC

**Policy:** Deletes staging services older than 3 days

**Manual Cleanup:**
```bash
# Trigger cleanup manually
gcloud builds submit \
  --config=cloudbuild-cleanup.yaml \
  --project=altegio-mcp

# Or delete specific service
gcloud run services delete altegio-mcp-feature-old \
  --region=europe-west1 \
  --project=altegio-mcp \
  --quiet
```

## Setup Instructions

### First-Time Setup

**1. Run setup script:**
```bash
./scripts/setup-triggers.sh
```

This creates:
- Production trigger (main branch)
- Staging trigger (all other branches)
- Cleanup Cloud Scheduler job

**2. Verify triggers:**
```bash
gcloud builds triggers list --project=altegio-mcp
```

### Manual Setup (Alternative)

**1. Create Production Trigger:**
```bash
gcloud builds triggers create github \
  --name="altegio-mcp-production" \
  --repo-name="altegio-pro-mcp" \
  --repo-owner="petroff" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region="europe-west1" \
  --project="altegio-mcp"
```

**2. Create Staging Trigger:**
```bash
gcloud builds triggers create github \
  --name="altegio-mcp-staging" \
  --repo-name="altegio-pro-mcp" \
  --repo-owner="petroff" \
  --branch-pattern="^(?!main$).*" \
  --build-config="cloudbuild-staging.yaml" \
  --region="europe-west1" \
  --project="altegio-mcp"
```

**3. Create Cleanup Job:**
```bash
gcloud scheduler jobs create http staging-cleanup \
  --location=europe-west1 \
  --schedule="0 2 * * *" \
  --time-zone="UTC" \
  --uri="https://cloudbuild.googleapis.com/v1/projects/altegio-mcp/triggers/altegio-mcp-cleanup:run" \
  --http-method=POST \
  --oidc-service-account-email="altegio-mcp@appspot.gserviceaccount.com"
```

## Local Testing

### Build Docker Image
```bash
docker build -t altegio-mcp:local .
```

### Run Locally
```bash
# Using .env
docker run --rm -d \
  --name altegio-mcp-local \
  -p 8080:8080 \
  --env-file .env \
  altegio-mcp:local

# Test
curl http://localhost:8080/health

# Stop
docker stop altegio-mcp-local
```

### Test Build Config
```bash
# Test production build
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=altegio-mcp

# Test staging build
gcloud builds submit \
  --config=cloudbuild-staging.yaml \
  --substitutions=BRANCH_NAME=test-branch \
  --project=altegio-mcp
```

## Troubleshooting

### Build Failures

**Check logs:**
```bash
gcloud builds list --limit=1 --project=altegio-mcp
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)" --project=altegio-mcp)
gcloud builds log $BUILD_ID --project=altegio-mcp
```

**Common issues:**
- ❌ Region mismatch: Check cloudbuild.yaml uses `europe-west1`
- ❌ Secret not found: Verify `altegio-api-token` exists in Secret Manager
- ❌ Permissions: Cloud Build SA needs `run.admin` role

### Deployment Failures

**Check service status:**
```bash
gcloud run services describe SERVICE_NAME \
  --region=europe-west1 \
  --project=altegio-mcp
```

**Check logs:**
```bash
gcloud run services logs read SERVICE_NAME \
  --region=europe-west1 \
  --limit=100 \
  --project=altegio-mcp
```

### Staging Not Deploying

**Verify trigger:**
```bash
gcloud builds triggers describe altegio-mcp-staging --project=altegio-mcp
```

**Check branch pattern:**
- Pattern: `^(?!main$).*` (all branches except main)
- File: `cloudbuild-staging.yaml`

### Cleanup Not Running

**Check scheduler job:**
```bash
gcloud scheduler jobs describe staging-cleanup \
  --location=europe-west1 \
  --project=altegio-mcp
```

**Trigger manually:**
```bash
gcloud scheduler jobs run staging-cleanup \
  --location=europe-west1 \
  --project=altegio-mcp
```

## Cost Optimization

### Production
- **Always running:** 1 instance minimum
- **Monthly cost:** ~$50 (1Gi RAM, 2 CPU)

### Staging
- **Scale to zero:** No cost when idle
- **Auto-cleanup:** 3 days retention
- **Monthly cost:** ~$10-20 (3-5 active branches)

### Total Estimated Cost
- **Before:** ~$50/month (single environment)
- **After:** ~$60-70/month (production + staging)

## Security

### Secrets Management
- **Storage:** Google Cloud Secret Manager
- **Access:** Cloud Build service account only
- **Secret name:** `altegio-api-token`
- **Usage:** All environments use same token

### Service Authentication
- **Public URL:** Yes (`--allow-unauthenticated`)
- **API Auth:** Required via ALTEGIO_API_TOKEN
- **Reason:** MCP protocol requires direct access

### IAM Roles
```bash
# Cloud Build service account needs:
- roles/run.admin              # Deploy services
- roles/secretmanager.secretAccessor  # Read secrets
- roles/iam.serviceAccountUser # Act as service account
```

## Files

- `cloudbuild.yaml` - Production deployment (main branch)
- `cloudbuild-staging.yaml` - Staging deployment (all branches)
- `cloudbuild-cleanup.yaml` - Cleanup automation (scheduled)
- `scripts/setup-triggers.sh` - One-time setup script

## Best Practices

1. **Test in staging first:** Always push to feature branch before merging to main
2. **Check build logs:** Monitor Cloud Build for errors
3. **Use semantic commits:** Helps track what triggered deployments
4. **Delete old branches:** Reduces number of staging services
5. **Monitor costs:** Check GCP billing dashboard regularly

## Migration from Old Setup

**Old:** Single service `altegio-mcp-staging` on push to main

**New:**
- Production: `altegio-mcp` (main branch)
- Staging: `altegio-mcp-{branch}` (all branches)

**No action needed:** Old service remains as production, no downtime.

---

**Setup:** `./scripts/setup-triggers.sh`
**Support:** [GitHub Issues](https://github.com/petroff/altegio-pro-mcp/issues)
