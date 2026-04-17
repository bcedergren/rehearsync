# Quick Deployment Guide

Get RehearSync deployed to production in under 30 minutes.

---

## Prerequisites (5 minutes)

Install required CLI tools:

```bash
# Vercel CLI
npm install -g vercel

# Supabase CLI (optional, for Edge Functions)
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase
```

Create accounts (if you haven't already):
- [Vercel](https://vercel.com) - Next.js hosting
- [Supabase](https://supabase.com) - Database & Storage
- [Stripe](https://stripe.com) - Payments
- [Resend](https://resend.com) - Email
- [Replicate](https://replicate.com) - AI Processing
- [OpenAI](https://platform.openai.com) - GPT-4o

---

## Step 1: Supabase Setup (10 minutes)

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project**
3. Name: `rehearsync-production`
4. Database Password: (save this!)
5. Region: Choose closest to your users
6. Click **Create new project**

### Run Migrations

```bash
# Copy connection strings from Supabase dashboard
export DATABASE_URL="postgresql://..."
export DIRECT_DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy
```

### Create Storage Bucket

1. **Storage** → **New bucket**
2. Name: `rehearsync-assets`
3. Public bucket: ✅ Yes
4. **Create bucket**

### Get API Keys

**Settings** → **API** → Copy:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Vercel Deployment (5 minutes)

### Deploy to Vercel

```bash
# From project root
npm run deploy
```

This will:
- Run pre-deployment checks
- Build the application
- Deploy to Vercel
- Run health checks

Or manually:

```bash
vercel --prod
```

### Set Environment Variables

Option A: Interactive setup (recommended for first time):

```bash
npm run vercel:setup
```

Option B: Manually in Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add all variables from `.env.example`
3. Click **Redeploy** after adding variables

---

## Step 3: Configure Services (10 minutes)

### Stripe

1. **Dashboard** → **Products** → Create products:
   - Band Monthly ($29.99/month)
   - Band Yearly ($299/year)
   - Agent Monthly ($99.99/month)
   - Agent Yearly ($999/year)
2. Copy Price IDs → Add to Vercel env vars
3. **Webhooks** → Add endpoint:
   - URL: `https://yourdomain.com/api/v1/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Copy **Signing secret** → Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### Resend

1. **API Keys** → Create new key
2. **Domains** → Add your domain
3. Verify DNS records (SPF, DKIM)
4. Copy API key → Add to Vercel as `RESEND_API_KEY`

### Replicate

1. **Account** → **API Tokens** → Create
2. Copy token → Add to Vercel as `REPLICATE_API_TOKEN`
3. Generate webhook secret: `openssl rand -hex 32`
4. Add to Vercel as `REPLICATE_WEBHOOK_SECRET`

### OpenAI

1. **API Keys** → Create new secret key
2. Copy key → Add to Vercel as `OPENAI_API_KEY`

---

## Step 4: Deploy Supabase Edge Functions (5 minutes)

```bash
npm run deploy:supabase
```

This will:
- Link to your Supabase project
- Set required secrets
- Deploy the `replicate-webhook` function

Function URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/replicate-webhook`

Add this URL to Replicate dashboard as webhook endpoint.

---

## Step 5: Deploy WebSocket Server (Optional, 10 minutes)

Choose one platform:

### Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub**
3. Select your repository
4. Railway auto-detects `railway.json`
5. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
6. Deploy
7. Copy public URL → Update `NEXT_PUBLIC_WS_URL` in Vercel

### Render

1. Go to [render.com](https://render.com)
2. **New Web Service** → Connect GitHub
3. Render auto-detects `render.yaml`
4. Deploy
5. Copy URL → Update `NEXT_PUBLIC_WS_URL` in Vercel

### Fly.io

```bash
fly launch  # Creates app from fly.toml
fly secrets set DATABASE_URL=... NEXTAUTH_SECRET=...
fly deploy
```

---

## Step 6: Verify Deployment (5 minutes)

### Smoke Tests

1. **Homepage**: https://yourdomain.com
2. **Health Check**: https://yourdomain.com/health
3. **Register**: Create a test account
4. **Email**: Check verification email arrives
5. **Verify Email**: Click link in email
6. **Login**: Sign in with test account
7. **Dashboard**: Create a test band
8. **Onboarding**: Add members
9. **Song Upload**: Test audio upload (small file)

### Check Logs

```bash
# Vercel logs
vercel logs --follow

# Supabase Edge Function logs
# Dashboard → Logs → Edge Functions
```

---

## Quick Command Reference

```bash
# Pre-deployment check
npm run deploy:check

# Deploy to production
npm run deploy

# Deploy to staging
npm run deploy:staging

# Deploy Supabase functions
npm run deploy:supabase

# Set up Vercel env vars
npm run vercel:setup

# View Vercel logs
vercel logs --follow

# Rollback deployment
vercel rollback
```

---

## Environment Variables Checklist

Copy this to track your progress:

**Database:**
- [ ] `DATABASE_URL`
- [ ] `DIRECT_DATABASE_URL`

**Auth:**
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `GOOGLE_CLIENT_ID` (optional)
- [ ] `GOOGLE_CLIENT_SECRET` (optional)

**Supabase:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_STORAGE_BUCKET`

**Stripe:**
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_BAND_MONTHLY`
- [ ] `STRIPE_PRICE_BAND_YEARLY`
- [ ] `STRIPE_PRICE_AGENT_MONTHLY`
- [ ] `STRIPE_PRICE_AGENT_YEARLY`

**Email:**
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`

**AI:**
- [ ] `REPLICATE_API_TOKEN`
- [ ] `REPLICATE_WEBHOOK_SECRET`
- [ ] `OPENAI_API_KEY`

**WebSocket:**
- [ ] `NEXT_PUBLIC_WS_URL`
- [ ] `WS_PORT` (3001)

---

## Troubleshooting

### Build Fails

```bash
# Check environment variables
vercel env ls

# Test build locally
npm run build
```

### Database Connection Fails

```bash
# Test connection
npx prisma db pull

# Verify connection string format
# Should be: postgresql://user:pass@host:5432/db?pgbouncer=true
```

### Email Not Sending

1. Verify domain in Resend dashboard
2. Check DNS records (SPF, DKIM)
3. Test with sandbox: `onboarding@resend.dev`

### Stripe Webhooks Not Working

```bash
# Test locally
stripe listen --forward-to localhost:5000/api/v1/stripe/webhook

# Verify secret matches
vercel env pull
cat .env.local | grep STRIPE_WEBHOOK_SECRET
```

---

## Post-Deployment

After successful deployment:

1. **Custom Domain**: Add in Vercel → Settings → Domains
2. **Monitoring**: Set up [UptimeRobot](https://uptimerobot.com) for `/health`
3. **Error Tracking**: Install Sentry (see `MONITORING_SETUP.md`)
4. **Analytics**: Enable Vercel Analytics
5. **Backups**: Configure database backups in Supabase

---

## Need Help?

- Check `DEPLOYMENT.md` for detailed instructions
- View logs: `vercel logs --follow`
- Supabase logs: Dashboard → Logs
- GitHub Issues: Create an issue with error logs

---

**Total Time**: ~30 minutes  
**Cost**: $0 initially (free tiers), ~$180-250/mo at scale
