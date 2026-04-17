# RehearSync Deployment Guide

This guide covers deploying RehearSync to production.

---

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with latest code pushed
- [ ] All environment variables documented in `.env.example`
- [ ] All 27 tests passing (`npm test`)
- [ ] Production database ready (Supabase or managed PostgreSQL)
- [ ] Supabase project for file storage
- [ ] Stripe account with products/prices configured
- [ ] Resend account with verified sending domain
- [ ] Replicate API account
- [ ] OpenAI API account

---

## Architecture Overview

```
┌─────────────────┐
│   Vercel        │  ← Next.js App (SSR + API Routes)
│   (Next.js)     │
└─────────────────┘
        │
        ├──→ Supabase (PostgreSQL + Storage)
        ├──→ Supabase Edge Functions (Replicate webhooks)
        ├──→ WebSocket Server (Railway/Render/Fly.io)
        ├──→ Stripe (Payments)
        ├──→ Resend (Email)
        ├──→ Replicate (AI Processing)
        └──→ OpenAI (GPT-4o)
```

---

## Step 1: Deploy Database & Storage (Supabase)

### 1.1 Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project (select closest region to users)
3. Wait for database provisioning (~2 minutes)
4. Go to **Settings > Database** → copy connection strings:
   - `DATABASE_URL` (transaction pooler)
   - `DIRECT_DATABASE_URL` (direct connection for migrations)

### 1.2 Run Database Migrations

```bash
# Set environment variables locally
export DATABASE_URL="postgresql://..."
export DIRECT_DATABASE_URL="postgresql://..."

# Run Prisma migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 1.3 Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Create new bucket: `rehearsync-assets`
3. Set to **Public** (or Private with signed URLs)
4. Configure CORS (allow `*.vercel.app` and your domain)
5. Set file size limit (e.g., 100MB for audio files)

### 1.4 Get API Keys

1. Go to **Settings > API**
2. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Step 2: Deploy Supabase Edge Functions

Replicate webhooks must be handled by a Supabase Edge Function (to avoid Vercel serverless timeout limits).

### 2.1 Install Supabase CLI

```bash
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase
```

### 2.2 Link to Your Project

```bash
cd supabase
supabase link --project-ref YOUR_PROJECT_REF
```

### 2.3 Deploy Edge Function

```bash
supabase functions deploy replicate-webhook
```

### 2.4 Set Secrets

```bash
supabase secrets set REPLICATE_WEBHOOK_SECRET="your-webhook-secret"
supabase secrets set DATABASE_URL="postgresql://..."
```

### 2.5 Verify Deployment

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/replicate-webhook \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"test": true}'
```

---

## Step 3: Deploy Next.js App (Vercel)

### 3.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select **Next.js** framework preset
4. Set **Root Directory** to `/` (if monorepo, adjust)

### 3.2 Configure Environment Variables

In Vercel dashboard → **Settings > Environment Variables**, add all from `.env.example`:

**Database:**
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`

**Auth:**
- `NEXTAUTH_URL` → `https://yourdomain.com`
- `NEXTAUTH_SECRET` → Generate: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` → `rehearsync-assets`

**Stripe:**
- `STRIPE_SECRET_KEY` → `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` → Create webhook first (see Step 4)
- `STRIPE_PRICE_BAND_MONTHLY`
- `STRIPE_PRICE_BAND_YEARLY`
- `STRIPE_PRICE_AGENT_MONTHLY`
- `STRIPE_PRICE_AGENT_YEARLY`

**Email:**
- `RESEND_API_KEY`
- `EMAIL_FROM` → `RehearSync <noreply@yourdomain.com>`

**AI:**
- `REPLICATE_API_TOKEN`
- `REPLICATE_WEBHOOK_SECRET` → Same as Supabase secret
- `OPENAI_API_KEY`

**WebSocket:**
- `NEXT_PUBLIC_WS_URL` → `wss://your-ws-server.railway.app` (see Step 5)
- `WS_PORT` → `3001` (not used in production)

### 3.3 Deploy

1. Click **Deploy** in Vercel
2. Wait for build (~3-5 minutes)
3. Verify deployment at `https://your-project.vercel.app`

### 3.4 Add Custom Domain

1. Go to **Settings > Domains**
2. Add your domain (e.g., `app.rehearsync.com`)
3. Configure DNS:
   - **A record** or **CNAME** → Vercel's servers
   - Vercel auto-provisions SSL via Let's Encrypt
4. Update `NEXTAUTH_URL` environment variable to your domain
5. Redeploy

---

## Step 4: Configure Stripe Webhooks

### 4.1 Create Webhook Endpoint

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/v1/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4.2 Copy Signing Secret

1. Click on webhook → **Signing secret**
2. Copy `whsec_...` value
3. Add to Vercel env vars: `STRIPE_WEBHOOK_SECRET`
4. Redeploy

### 4.3 Test Webhook

```bash
stripe listen --forward-to https://yourdomain.com/api/v1/stripe/webhook
stripe trigger checkout.session.completed
```

---

## Step 5: Deploy WebSocket Server

The WebSocket server must be deployed separately (not on Vercel due to connection persistence requirements).

### Option A: Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repository, set **Root Directory** to `/`
4. Add **Start Command**: `npm run ws:dev`
5. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
6. Expose port `3001`
7. Copy public URL (e.g., `wss://rehearsync-ws.railway.app`)
8. Update `NEXT_PUBLIC_WS_URL` in Vercel

### Option B: Render

1. Go to [render.com](https://render.com)
2. New Web Service → Connect GitHub
3. Build Command: `npm install`
4. Start Command: `npm run ws:dev`
5. Add environment variables
6. Deploy
7. Copy public URL

### Option C: Fly.io

1. Install Fly CLI: `brew install flyctl`
2. Login: `fly auth login`
3. Create `fly.toml`:

```toml
app = "rehearsync-ws"

[build]
  builder = "heroku/buildpacks:20"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

4. Deploy: `fly deploy`
5. Set secrets: `fly secrets set DATABASE_URL=...`

---

## Step 6: Configure Replicate Webhooks

1. Go to [Replicate Dashboard](https://replicate.com/account)
2. Under **Webhooks**, add endpoint:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/replicate-webhook`
   - Secret: Same as `REPLICATE_WEBHOOK_SECRET`
3. Test webhook:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/replicate-webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test-prediction", "status": "succeeded"}'
```

---

## Step 7: DNS & SSL

### 7.1 Configure DNS

Point your domain to Vercel:

**Option 1: CNAME (recommended)**
```
app.rehearsync.com → cname.vercel-dns.com
```

**Option 2: A Record**
```
app.rehearsync.com → 76.76.21.21 (Vercel IP)
```

### 7.2 SSL Certificate

Vercel auto-provisions SSL certificates via Let's Encrypt. No manual configuration needed.

---

## Step 8: Monitoring & Logging

### 8.1 Error Tracking (Sentry)

1. Create Sentry project at [sentry.io](https://sentry.io)
2. Install SDK:

```bash
npm install @sentry/nextjs
```

3. Initialize:

```bash
npx @sentry/wizard@latest -i nextjs
```

4. Add environment variables:
   - `SENTRY_DSN`
   - `SENTRY_AUTH_TOKEN`

### 8.2 Uptime Monitoring

Options:
- **Vercel Monitoring** (built-in, paid)
- **UptimeRobot** (free, basic)
- **Better Uptime** (paid, advanced)
- **Pingdom** (paid)

Set up alerts for:
- HTTP 5xx errors
- Response time > 2s
- Downtime > 1 minute

### 8.3 Application Logs

**Vercel Logs:**
- Go to **Deployments > [Your Deployment] > Runtime Logs**
- View real-time logs and errors

**Supabase Logs:**
- Go to **Logs > Edge Functions**
- Monitor webhook handler execution

---

## Step 9: Post-Deployment Checklist

### 9.1 Smoke Tests

- [ ] Visit homepage → loads correctly
- [ ] Register new account → verification email sent
- [ ] Verify email → redirects to login
- [ ] Login → redirects to dashboard
- [ ] Create band → onboarding wizard works
- [ ] Add song → audio upload works
- [ ] Upload audio → AI processing triggers
- [ ] Check processing jobs → Replicate webhook handled
- [ ] View arrangement → sheet music/audio renders
- [ ] Subscribe to paid plan → Stripe checkout works
- [ ] Test WebSocket session → real-time sync works

### 9.2 Security Checks

- [ ] HTTPS enabled (SSL certificate active)
- [ ] `NEXTAUTH_SECRET` is strong and unique
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not exposed in client code
- [ ] Stripe webhook signature verified
- [ ] Replicate webhook signature verified
- [ ] CORS configured correctly on Supabase Storage
- [ ] Rate limiting enabled (TODO: implement)

### 9.3 Performance Checks

- [ ] Lighthouse score > 90 (performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Database queries optimized (indexes added)
- [ ] Images optimized (Next.js Image component used)
- [ ] Bundle size < 300KB (gzipped)

---

## Step 10: Rollback Procedures

### If Deployment Fails

**Vercel:**
1. Go to **Deployments**
2. Find last working deployment
3. Click **Promote to Production**

**Database Migration Rollback:**
```bash
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

**Supabase Edge Function Rollback:**
```bash
git revert HEAD
supabase functions deploy replicate-webhook
```

---

## Common Issues

### Issue: Database Connection Fails

**Solution:**
1. Check `DATABASE_URL` is correct (pooler URL, not direct)
2. Verify Supabase project is not paused
3. Check connection limit (increase in Supabase settings)

### Issue: Replicate Webhook Timeouts

**Solution:**
1. Verify Edge Function is deployed: `supabase functions list`
2. Check Edge Function logs: Supabase Dashboard > Logs
3. Increase timeout in `supabase/functions/replicate-webhook/index.ts`

### Issue: Stripe Webhooks Fail

**Solution:**
1. Verify webhook signature in Stripe Dashboard
2. Check `STRIPE_WEBHOOK_SECRET` matches
3. Test locally: `stripe listen --forward-to localhost:5000/api/v1/stripe/webhook`

### Issue: Email Not Sending

**Solution:**
1. Verify domain in Resend dashboard
2. Check SPF/DKIM DNS records
3. Test with Resend's sandbox email: `onboarding@resend.dev`

---

## Scaling Considerations

### Database
- Enable connection pooling (already using Supabase pooler)
- Add read replicas for high traffic (Supabase Pro)
- Monitor slow queries: `prisma.$on('query', ...)`

### File Storage
- Implement CDN (Cloudflare, AWS CloudFront)
- Compress audio files before upload (client-side)
- Set lifecycle policies (auto-delete old versions)

### WebSocket Server
- Use Redis for session state (multi-instance support)
- Load balance with HAProxy or Nginx
- Monitor connection count and memory usage

### AI Processing
- Set rate limits on Replicate API calls
- Queue jobs for batch processing (reduce costs)
- Cache transcription results (avoid re-processing)

---

## Cost Estimates (Monthly)

**Vercel Pro**: $20  
**Supabase Pro**: $25  
**Railway/Render**: $7-15 (WebSocket server)  
**Replicate**: $50-200 (pay-per-use, varies by usage)  
**OpenAI**: $50-100 (GPT-4o usage)  
**Resend**: Free tier (50k emails/mo) or $20  
**Stripe**: Free (2.9% + 30¢ per transaction)  
**Domain**: $15/year  
**Sentry**: Free tier or $26/mo  

**Total**: ~$180-250/mo (before payment processing fees)

---

## Production Readiness Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] Supabase Edge Function deployed
- [ ] WebSocket server deployed and reachable
- [ ] Stripe webhooks configured and tested
- [ ] Replicate webhooks configured and tested
- [ ] Custom domain configured with SSL
- [ ] Error tracking (Sentry) integrated
- [ ] Uptime monitoring configured
- [ ] Privacy Policy and Terms of Service published
- [ ] All smoke tests passed
- [ ] Backup strategy defined
- [ ] Rollback procedure documented
- [ ] On-call rotation defined (if team)

---

## Support & Troubleshooting

**Logs:**
- Vercel: `vercel logs --follow`
- Supabase: Dashboard > Logs > Edge Functions
- Railway: Dashboard > Deployments > Logs

**Database:**
- Prisma Studio: `npx prisma studio` (connect to production DB)
- SQL Editor: Supabase Dashboard > SQL Editor

**Monitoring:**
- Vercel Analytics: Dashboard > Analytics
- Sentry: Dashboard > Issues

---

**Last Updated**: April 17, 2026  
**Maintained By**: RehearSync Engineering
