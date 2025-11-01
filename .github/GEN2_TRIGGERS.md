# Cloud Build Gen2 Production Trigger

**Status:** Active
**Trigger:** mcp-pro-production (Gen2)
**Event:** Push to main (after PR merge)
**Config:** cloudbuild.yaml
**Region:** europe-west1

## Architecture

- **Staging:** mcp-pro-staging (Pull Request trigger)
- **Production:** mcp-pro-production (Push to main trigger)

Both using Cloud Build 2nd gen repositories.

