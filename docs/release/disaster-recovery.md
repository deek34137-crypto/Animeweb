# Operations & Disaster Recovery Runbook

This runbook outlines procedures for incident response, database recovery, and resource tuning for the Aniworld production environment.

---

## 1. Incident Response: High Error Rates or Slow Responses

### Step 1: Check Application Health
Query the liveness and readiness endpoints:
```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/health/ready
```
* If `/api/health` fails: The Node.js process is dead or unresponsive. Restart the container/service immediately.
* If `/api/health/ready` returns `503 Service Unavailable`: One of the downstream dependencies (Postgres, Redis, Meilisearch) is offline or exhibiting high latency.

### Step 2: Check Active Connections and Leases
Examine structured logs for correlation IDs and timeout errors:
```bash
docker logs aniworld-app | grep "error"
```
If connection timeouts are detected, refer to Section 3 (Connection Tuning) below.

---

## 2. Backup & Restore Procedures

### Database Backups (PostgreSQL)
We recommend automated daily logical backups (`pg_dump`) retained for 30 days.

#### Manual Backup
```bash
pg_dump -U postgres -h [DB_HOST] -d [DB_NAME] -F c -b -v -f aniworld_backup.dump
```

#### Manual Restore
1. Spin up a clean Postgres instance.
2. Run restore command:
```bash
pg_restore -U postgres -h [DB_HOST] -d [DB_NAME] -v aniworld_backup.dump
```
3. Run prisma migrations to sync schema:
```bash
npx prisma db push
```

---

## 3. Database Connection Pool Tuning

If Postgres logs `remaining connection slots are reserved` or Next.js throws connection pool timeouts:

### 1. Prisma Connection Limits
Next.js serverless functions or container restarts can exhaust pool connections. Tune the connection limit in `DATABASE_URL`:
```env
DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=10&pool_timeout=20"
```

### 2. PgBouncer Setup
In production, always connect through **PgBouncer** (in transaction mode) to multiplex connection slots.
* **Supabase/Neon Pooler URL**: Use port `6543` (transaction pooler) instead of port `5432` (direct connection).
* Ensure `DIRECT_URL` is set separately for prisma migrations (which require direct access).

---

## 4. Disaster Recovery Checklist

- [ ] **DNS Failover**: Update Cloudflare DNS to point to the backup region/cluster if the primary provider goes completely dark.
- [ ] **Cache Flush**: If Redis exhibits cache corruption or memory exhaustion, flush cache:
  ```bash
  redis-cli FLUSHALL
  ```
- [ ] **Meilisearch Re-index**: If search index becomes out-of-sync or corrupted, trigger a complete backfill:
  ```bash
  npm run backfill
  ```
