# Pipeline

**Flow:**
```
Merge request to main → GitHub → Cloud Build → Artifact Registry → Cloud Run
```

**Google Cloud Project:** `altegio-mcp` (project #767969350727)
**Staging URL:** https://altegio-mcp-staging-767969350727.us-central1.run.app

**Configuration:**
- `cloudbuild.yaml` - build/deploy steps
- Secret Manager: `altegio-api-token` (partner token)
- Artifact Registry: `us-central1-docker.pkg.dev/altegio-mcp/altegio-mcp/server`
- Auto-deploy on push to main, no manual builds needed

**Local Testing:**
```bash
# Build and run
npm run build && npm start

# Docker
docker build -t altegio-mcp:local .
docker run --rm -p 8080:8080 --env-file .env altegio-mcp:local

# Docker Compose
docker-compose -f docker-compose.local.yml up
```

**Secrets Management:**
- Cloud: Secret Manager secret `altegio-api-token`
- Use `--update-secrets` in Cloud Run deploy

**Build after changes:**
- Always run `npm run build` after source modifications
- Verify `dist/` is updated before commits
- CI/CD rebuilds automatically