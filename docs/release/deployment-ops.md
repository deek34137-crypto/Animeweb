# Operational Runbook & Deployment Guidelines

This document details the pre-release checks, rollback procedures, backup strategies, and entrypoint rate-limiting recommendations for running the Aniworld application in production.

---

## 1. Pre-release Deployment Checklist

Before triggering a release to production, ensure the following checklist is completed:

- [ ] **Environment Variables Verification**:
  - Validated all mandatory variables (e.g. `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`).
  - Verified conditional variables (e.g. `REDIS_URL` if caching/limiter is enabled, `MEILISEARCH_HOST` if search is enabled).
- [ ] **Prisma Migrations Applied**:
  - Run database schema migration: `npx prisma migrate deploy` in the deployment target or releasing CI pipeline.
- [ ] **Image Tag Alignment**:
  - Checked that the release image tag matches the build hash or version release number.
- [ ] **Pre-release Smoke Testing**:
  - Successfully ran `npm run smoke-test` against the staging/preview environment.
- [ ] **Liveness and Readiness Healthy**:
  - Verified that `/api/health` and `/api/health/ready` endpoints return `200 OK` on current staging.
- [ ] **Metrics Exporting**:
  - Scraped `/api/metrics` to ensure prometheus metrics (including the `aniworld_http_` prefix counters) are active.
- [ ] **Centralized Logs Streaming**:
  - Confirmed stdout/stderr logs from the application are actively streaming to the log aggregator (e.g. Datadog, CloudWatch, GCP Logging).
- [ ] **Rollback Plan Verified**:
  - Confirmed the last stable container image is available in the container registry to instantly roll back if needed.

---

## 2. Rollback Strategy

In the event of a critical failure (e.g., failed smoke test, crash loops, database lockout):

1. **Deploy Last Stable Container**:
   - Immediately update the deployment tag (e.g. on Railway, Kubernetes, Coolify, or ECS) to point back to the previous stable release tag.
   - For example:
     - `docker service update --image registry/aniworld:last-stable-tag aniworld`
     - Or update the K8s deployment file or pull/re-tag the image:
       `docker tag registry/aniworld:stable-v1.x registry/aniworld:latest && docker compose up -d`
2. **Revert Schema Migrations (if necessary)**:
   - If the new release applied backward-incompatible database schema changes, roll back using a rollback migration script or restore the database from the last automated snapshot before deployment.
3. **Trigger Alert & Investigate**:
   - Trace the issue in the logs using the `requestId` of the failing transaction to locate the root cause.

---

## 3. Backup & Disaster Recovery Strategy

### Database (PostgreSQL)
- **Managed Providers (Recommended)**:
  - If using Neon, Supabase, AWS RDS, or GCP Cloud SQL, enable automated daily backups with a minimum retention period of 7–14 days.
  - Enable point-in-time recovery (PITR) to allow restoring the database to a specific second before any corrupt release.
- **Self-Hosted / Standalone**:
  - Schedule regular database snapshots using `pg_dump` via a cron job and copy the backups to a secure, isolated S3 bucket:
    ```bash
    pg_dump -U postgres -h db -F t aniworld | aws s3 cp - s3://aniworld-backups/db-$(date +%F).tar
    ```

### Cache & Queue (Redis)
- To maintain Outbox queue persistence:
  - Enable **AOF (Append Only File)** persistence and **RDB snapshots** in the Redis configuration (`redis.conf`):
    ```ini
    appendonly yes
    appendfsync everysec
    save 900 1
    ```

---

## 4. Rate Limiting & Request Protection

To protect the application from denial-of-service (DoS) attacks and brute-force attempts, it is highly recommended to implement rate limiting at the infrastructure edge.

### Platform-Specific recommendations
- **Cloudflare**: Enable Cloudflare DDoS Protection and configure Rate Limiting rules (e.g., block clients exceeding 100 requests per minute on `/api/auth/` routes).
- **AWS CloudFront / WAF**: Attach AWS WAF to CloudFront or Application Load Balancers with rate-based rules.

### Reverse Proxy Configuration (Reference)

#### Nginx
If deploying behind Nginx, add a rate-limiting zone to protect sensitive API endpoints:
```nginx
http {
    # Define rate-limiting zone based on client IP (10MB memory zone, 10 requests per second)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        listen 80;
        server_name aniworld.com;

        # Apply rate limiting to authentication and API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            proxy_pass http://localhost:3000;
        }
    }
}
```

#### Caddy
For Caddy servers, use the `rate_limit` directive:
```caddy
aniworld.com {
    # Rate limit request block
    rate_limit {
        zone api {
            key {remote_ip}
            rate 10r/s
            burst 20
        }
    }
    
    reverse_proxy localhost:3000
}
```

---

## 5. Domain & Environment Specific Configurations

The application supports multiple environments:
- **Production**: `https://animeworldrj.vercel.app`
- **Preview Production**: `https://aniworldrj.dpdns.org`

### Environment Variables
When deploying, make sure the `APP_URL` and `NEXT_PUBLIC_APP_URL` are configured properly for the environment:
- **Production (`animeworldrj.vercel.app`)**:
  ```env
  APP_URL="https://animeworldrj.vercel.app"
  NEXT_PUBLIC_APP_URL="https://animeworldrj.vercel.app"
  ```
- **Preview Production (`aniworldrj.dpdns.org`)**:
  ```env
  APP_URL="https://aniworldrj.dpdns.org"
  NEXT_PUBLIC_APP_URL="https://aniworldrj.dpdns.org"
  ```

### OAuth Redirect URIs
Since OAuth integrations (e.g., AniList and MyAnimeList trackers) validate redirect URIs, the callback URLs for both environments must be whitelisted in the developer portal settings:

#### Production
- **AniList Redirect URI**: `https://animeworldrj.vercel.app/api/auth/tracker/anilist/callback`
- **MyAnimeList Redirect URI**: `https://animeworldrj.vercel.app/api/auth/tracker/mal/callback`

#### Preview Production
- **AniList Redirect URI**: `https://aniworldrj.dpdns.org/api/auth/tracker/anilist/callback`
- **MyAnimeList Redirect URI**: `https://aniworldrj.dpdns.org/api/auth/tracker/mal/callback`
