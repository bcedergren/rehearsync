# Monitoring & Error Tracking Setup

This guide covers setting up Sentry for error tracking and monitoring in RehearSync.

---

## Sentry Setup (Recommended)

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up or log in
3. Create new project → Select **Next.js**
4. Copy your DSN (Data Source Name)

### 2. Install Sentry SDK

```bash
npm install @sentry/nextjs
```

### 3. Initialize Sentry

Run the wizard to auto-configure:

```bash
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts` (browser error tracking)
- `sentry.server.config.ts` (server error tracking)
- `sentry.edge.config.ts` (edge runtime error tracking)
- `next.config.ts` (Sentry webpack plugin)

### 4. Configure Environment Variables

Add to `.env.local` and Vercel:

```bash
SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
SENTRY_AUTH_TOKEN="your-auth-token"  # For uploading source maps
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="rehearsync"
```

### 5. Custom Error Context

Update `sentry.server.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out known noise
    if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
      return null;
    }
    return event;
  },
});
```

### 6. Manual Error Tracking

In API routes or server components:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { area: "audio-processing" },
    extra: { arrangementId, userId },
  });
  throw error;
}
```

### 7. User Context

Add to `lib/auth.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

export const auth = async () => {
  const session = await getSession();
  if (session?.user) {
    Sentry.setUser({
      id: session.user.id,
      email: session.user.email,
    });
  }
  return session;
};
```

---

## Alternative: LogRocket (Session Replay)

For visual session replay (optional, paid):

1. Sign up at [logrocket.com](https://logrocket.com)
2. Install: `npm install logrocket logrocket-react`
3. Initialize in `app/providers.tsx`:

```typescript
import LogRocket from "logrocket";

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  LogRocket.init("your-app-id");
}
```

---

## Uptime Monitoring

### Option 1: UptimeRobot (Free)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add Monitor → HTTP(s)
3. URL: `https://yourdomain.com/api/v1/health`
4. Interval: 5 minutes
5. Alert Contacts: Your email

### Option 2: Better Uptime (Paid)

1. Go to [betteruptime.com](https://betteruptime.com)
2. Create monitor with advanced checks:
   - SSL certificate expiry
   - DNS resolution time
   - Performance thresholds

---

## Application Performance Monitoring (APM)

### Vercel Analytics (Built-in)

Enable in Vercel Dashboard:
1. Go to your project → **Analytics**
2. Enable **Web Analytics**
3. View metrics: Web Vitals, Real User Monitoring

### New Relic (Alternative)

For deep APM (optional, paid):

1. Sign up at [newrelic.com](https://newrelic.com)
2. Install: `npm install newrelic`
3. Configure `newrelic.js`
4. Add to `package.json` scripts: `-r newrelic`

---

## Database Monitoring

### Supabase Built-in Monitoring

1. Dashboard → **Database** → **Performance**
2. View slow queries, connection count, cache hit ratio
3. Set up alerts for:
   - Connection pool exhaustion
   - Slow queries (> 1s)
   - High CPU usage

### Prisma Monitoring

Log slow queries:

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
  ],
});

prisma.$on("query" as never, (e: any) => {
  if (e.duration > 1000) {
    console.warn(`Slow query (${e.duration}ms):`, e.query);
  }
});
```

---

## Cost Alerts

### Replicate

Set up spending alerts:
1. Dashboard → **Settings** → **Billing**
2. Set monthly budget alert

### Supabase

Monitor usage:
1. Dashboard → **Settings** → **Usage**
2. Set up alerts for bandwidth/storage limits

### Vercel

1. Dashboard → **Settings** → **Usage**
2. Set budget alerts for bandwidth and build minutes

---

## Health Check Endpoint

Already implemented at `/api/v1/health/route.ts`:

```typescript
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", timestamp: new Date() });
  } catch (error) {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
```

Monitor this endpoint with uptime service.

---

## Alerts & Notifications

### Critical Alerts (Immediate)
- Database connection failure
- Payment processing errors
- Auth service down
- AI processing webhook failures

### Warning Alerts (15-minute delay)
- High error rate (> 1%)
- Slow response times (> 2s)
- High memory usage (> 80%)
- Approaching tier limits

### Info Alerts (Daily digest)
- New user signups
- Subscription changes
- Processing job completions

---

## Dashboard Setup

Create monitoring dashboard with:

1. **System Health**
   - Uptime (last 30 days)
   - Response time (p50, p95, p99)
   - Error rate

2. **Business Metrics**
   - Active users (DAU, MAU)
   - New signups
   - Paid conversions
   - Churn rate

3. **Technical Metrics**
   - API request rate
   - Database query count
   - AI processing jobs (pending, completed, failed)
   - WebSocket connections

4. **Costs**
   - Replicate spend (daily)
   - OpenAI spend (daily)
   - Infrastructure costs (monthly projection)

---

## Incident Response

### On-Call Rotation

Define who responds to alerts:
- **Primary**: Lead developer
- **Secondary**: CTO/Senior engineer
- **Escalation**: CEO (critical outages only)

### Runbook

When alert fires:

1. **Acknowledge** alert (stop alarm)
2. **Assess** severity (P0-P3)
3. **Investigate** logs (Vercel, Sentry, Supabase)
4. **Mitigate** impact (rollback deployment, scale resources)
5. **Communicate** status (status page, Twitter)
6. **Resolve** root cause
7. **Post-mortem** (for P0/P1 incidents)

---

## Logging Best Practices

### Structured Logging

Use consistent log format:

```typescript
console.log(JSON.stringify({
  level: "info",
  message: "Processing job started",
  jobId: job.id,
  userId: user.id,
  timestamp: new Date().toISOString(),
}));
```

### Log Levels

- **DEBUG**: Detailed diagnostic info (development only)
- **INFO**: General informational messages
- **WARN**: Warning messages (potential issues)
- **ERROR**: Error events (still allows app to continue)
- **FATAL**: Critical errors (app cannot continue)

### What NOT to Log

- Passwords or tokens
- Credit card numbers
- Personal data (GDPR)
- Large binary data

---

## Recommended Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 1% | > 5% |
| Response Time (p95) | > 1s | > 3s |
| Database Connections | > 70% | > 90% |
| Memory Usage | > 70% | > 85% |
| Uptime | < 99.5% | < 99% |
| Disk Space | > 70% | > 85% |

---

## Production Checklist

- [ ] Sentry installed and configured
- [ ] Uptime monitoring active (UptimeRobot or similar)
- [ ] Health check endpoint monitored
- [ ] Slow query logging enabled
- [ ] Error alerts configured (email/Slack)
- [ ] Cost alerts set up (Replicate, Supabase, Vercel)
- [ ] On-call rotation defined
- [ ] Incident response runbook created
- [ ] Post-mortem template prepared

---

**Last Updated**: April 17, 2026
