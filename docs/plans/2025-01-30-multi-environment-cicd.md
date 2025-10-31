# Multi-Environment CI/CD Design

**Date:** 2025-01-30
**Status:** Design Phase
**Goal:** Automatic staging per branch + production on main merge

## Current State

### Infrastructure
- **Project:** altegio-mcp
- **Artifact Registry:** altegio-mcp (europe-west1)
- **Cloud Run Service:** altegio-mcp (europe-west1)
- **Current Trigger:** Push to main → deploy to altegio-mcp

### Issues
1. ❌ cloudbuild.yaml uses us-central1, actual service in europe-west1
2. ❌ Only main branch deploys (no staging for feature branches)
3. ❌ Service named "altegio-mcp" should be "production"
4. ❌ No auto-cleanup for old staging environments

## Proposed Architecture

### 1. Production Environment (Main Branch)

**Trigger:** Push to `main` branch
**Service Name:** `altegio-mcp-production`
**Region:** europe-west1
**URL:** https://altegio-mcp-production-{hash}.a.run.app

**Config:**
- Memory: 1Gi
- CPU: 2
- Min instances: 1
- Max instances: 10
- Timeout: 3600s
- Secret: ALTEGIO_API_TOKEN (production secret)

### 2. Staging Environments (Feature Branches)

**Trigger:** Push to any branch except `main`
**Service Name Pattern:** `altegio-mcp-staging-{sanitized-branch-name}`
**Region:** europe-west1
**URL:** https://altegio-mcp-staging-{branch}-{hash}.a.run.app

**Naming Examples:**
```
feature/user-management    → altegio-mcp-staging-feature-user-management
fix/auth-bug              → altegio-mcp-staging-fix-auth-bug
docs/update-readme        → altegio-mcp-staging-docs-update-readme
```

**Config:**
- Memory: 512Mi
- CPU: 1
- Min instances: 0 (scale to zero)
- Max instances: 5
- Timeout: 3600s
- Secret: ALTEGIO_API_TOKEN (staging secret)
- Auto-delete: 7 days after last deployment

### 3. GitHub Actions CI (No Changes)

**Trigger:** Push/PR to any branch
**Jobs:**
- Lint
- Test (Node 18, 20, 22)
- Build
- Security audit

**Purpose:** Quality gates before Cloud Build deployment

## Implementation Plan

### Phase 1: Fix Current Issues (15 min)

1. **Update cloudbuild.yaml:**
   - Change region: us-central1 → europe-west1
   - Change service: altegio-mcp-staging → altegio-mcp-production
   - Add substitution variables for flexibility

2. **Rename Cloud Run service:**
   ```bash
   # Deploy with new name, migrate traffic, delete old
   gcloud run services update altegio-mcp \
     --region=europe-west1 \
     --tag=production
   ```

### Phase 2: Add Branch-Based Staging (30 min)

1. **Create cloudbuild-staging.yaml:**
   - Dynamic service naming based on branch
   - Branch name sanitization (remove slashes, special chars)
   - Lower resource limits

2. **Create Cloud Build triggers:**
   ```bash
   # Production trigger (main only)
   gcloud builds triggers create github \
     --name=altegio-mcp-production \
     --repo-name=altegio-pro-mcp \
     --repo-owner=petroff \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml

   # Staging trigger (all branches except main)
   gcloud builds triggers create github \
     --name=altegio-mcp-staging \
     --repo-name=altegio-pro-mcp \
     --repo-owner=petroff \
     --branch-pattern="^(?!main$).*" \
     --build-config=cloudbuild-staging.yaml
   ```

3. **Add substitution variables:**
   - `_BRANCH_NAME`: Sanitized branch name for service naming
   - `_ENVIRONMENT`: production | staging
   - `_REGION`: europe-west1

### Phase 3: Cleanup Automation (15 min)

1. **Create cleanup script:**
   - List all staging services
   - Check last deployment date
   - Delete services older than 7 days
   - Run via Cloud Scheduler (daily)

2. **Add to cloudbuild-cleanup.yaml:**
   ```yaml
   steps:
     - name: gcr.io/google.com/cloudsdktool/cloud-sdk
       entrypoint: bash
       args:
         - -c
         - |
           gcloud run services list --region=europe-west1 \
             --filter="metadata.name:altegio-mcp-staging-*" \
             --format="value(metadata.name)" | while read service; do
             # Check last update, delete if > 7 days
           done
   ```

3. **Create Cloud Scheduler job:**
   ```bash
   gcloud scheduler jobs create http staging-cleanup \
     --schedule="0 2 * * *" \
     --uri="https://cloudbuild.googleapis.com/v1/projects/altegio-mcp/triggers/cleanup:run" \
     --http-method=POST
   ```

### Phase 4: Documentation & Monitoring (10 min)

1. **Update CI-CD.md:**
   - Multi-environment workflow
   - How to access staging URLs
   - Cleanup policy

2. **Add monitoring:**
   - Alert on production deployment failures
   - Track staging environment count
   - Cost tracking per environment

## File Changes

### New Files
```
cloudbuild-staging.yaml       # Staging deployment config
cloudbuild-cleanup.yaml       # Cleanup automation
scripts/cleanup-staging.sh    # Cleanup logic
```

### Modified Files
```
cloudbuild.yaml              # Fix region, rename to production
CI-CD.md                     # Updated documentation
.github/workflows/ci.yml     # Add environment info to PR comments
```

## Service Naming Convention

### Production
```
altegio-mcp-production
```

### Staging (max 63 chars for Cloud Run)
```
altegio-mcp-staging-{branch}

Rules:
- Replace / with -
- Replace _ with -
- Lowercase
- Truncate to 50 chars max
- Append -staging suffix
```

## Environment Variables

### Production
```bash
NODE_ENV=production
LOG_LEVEL=info
ALTEGIO_API_TOKEN=<from secret: altegio-api-token-prod>
```

### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=debug
ALTEGIO_API_TOKEN=<from secret: altegio-api-token-staging>
```

## Security Considerations

1. **Secrets Separation:**
   - Production: `altegio-api-token-prod`
   - Staging: `altegio-api-token-staging`

2. **IAM:**
   - Cloud Build SA needs `run.admin` role
   - Separate SA for cleanup job

3. **Authentication:**
   - Production: Keep `--allow-unauthenticated` for MCP access
   - Staging: Same (requires valid credentials anyway)

## Cost Optimization

### Production
- Min instances: 1 (always warm)
- Estimated: ~$50/month

### Staging
- Min instances: 0 (scale to zero)
- Auto-delete after 7 days
- Estimated: ~$10-20/month total (3-5 active branches)

### Total Estimated Cost
- Before: ~$50/month (staging only)
- After: ~$60-70/month (production + staging)
- **Increase: ~$10-20/month** for production reliability

## Rollout Plan

1. **Day 1: Test in feature branch**
   - Create feature/cicd-improvement
   - Implement Phase 1-2
   - Test staging deployment

2. **Day 2: Production migration**
   - Rename service during low-traffic period
   - Update DNS if needed
   - Monitor for issues

3. **Day 3: Cleanup automation**
   - Implement Phase 3
   - Test cleanup logic manually
   - Enable Cloud Scheduler

## Success Metrics

- ✅ Every push to feature branch creates staging environment
- ✅ Staging URL available in build logs
- ✅ Main merges deploy to production automatically
- ✅ No manual staging environment management needed
- ✅ Old staging environments auto-deleted after 7 days
- ✅ Production uptime: 99.9%
- ✅ Staging deployment time: < 5 minutes

## Rollback Plan

If issues occur:
1. Revert to single cloudbuild.yaml
2. Update trigger to deploy to original service name
3. Delete all staging services manually
4. Investigate and fix before retry

## Questions to Resolve

1. ❓ Should we use separate GCP projects for prod/staging?
2. ❓ Do we need blue/green deployment for production?
3. ❓ Should staging use a different database/API?
4. ❓ What's the policy for long-lived feature branches?

## References

- [Cloud Build Triggers](https://cloud.google.com/build/docs/automating-builds/create-manage-triggers)
- [Cloud Run Multi-environment](https://cloud.google.com/run/docs/multiple-environments)
- [Branch-based deployment](https://cloud.google.com/build/docs/deploying-builds/deploy-cloud-run)
