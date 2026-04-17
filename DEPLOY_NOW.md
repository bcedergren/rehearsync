# Deploy RehearSync Now - Step by Step

This guide will walk you through deploying RehearSync to production **right now**.

---

## Prerequisites Setup (5 minutes)

### Install Required Tools

```bash
# Install Vercel CLI
npm install -g vercel

# Install Supabase CLI (optional, for Edge Functions)
npm install -g supabase
# OR on macOS:
brew install supabase/tap/supabase
```

### Create Accounts (if not already done)

Open these links and create accounts:

1. [Vercel](https://vercel.com/signup) - Next.js hosting
2. [Supabase](https://supabase.com/dashboard) - Database & Storage
3. [Stripe](https://dashboard.stripe.com/register) - Payments
4. [Resend](https://resend.com/signup) - Email
5. [Replicate](https://replicate.com/signin) - AI Processing
6. [OpenAI](https://platform.openai.com/signup) - GPT-4o

---

## Phase 1: Database Setup (10 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - Name: `rehearsync-production`
   - Database Password: (create a strong password and save it!)
   - Region: `us-east-1` (or closest to your users)
4. Click **Create new project** (wait ~2 minutes)

### Step 2: Get Database Connection Strings

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String**
3. Copy **Connection pooling** URL (this is `DATABASE_URL`)
4. Copy **Direct connection** URL (this is `DIRECT_DATABASE_URL`)
5. Save both - you'll need them soon

### Step 3: Run Database Migrations

```bash
# Set environment variables temporarily
export DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
export DIRECT_DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Run migrations
npx prisma migrate deploy
```

### Step 4: Create Storage Bucket

1. In Supabase, go to **Storage**
2. Click **New bucket**
3. Name: `rehearsync-assets`
4. Make it **Public**
5. Click **Create bucket**

### Step 5: Get Supabase API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Phase 2: Deploy to Vercel (15 minutes)

### Step 1: Link Repository to Vercel

```bash
# From your project root
vercel login

# Link project
vercel link
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (Choose your account)
- Link to existing project? **N**
- What's your project's name? `rehearsync`
- In which directory is your code located? `./`

### Step 2: Set Environment Variables

Create a `.env.production` file with all your values:

```bash
# Copy template
cp .env.example .env.production
```

Now edit `.env.production` and fill in all values:

**Database:**
```env
DATABASE_URL="postgresql://..."  # From Supabase
DIRECT_DATABASE_URL="postgresql://..."  # From Supabase
```

**Auth:**
```env
NEXTAUTH_URL="https://yourdomain.com"  # Your domain (or use Vercel URL for now)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate a strong secret
```

**Supabase:**
```env
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
SUPABASE_STORAGE_BUCKET="rehearsync-assets"
```

**Stripe** (get from Stripe dashboard):
```env
STRIPE_SECRET_KEY="sk_test_..."  # Use test key initially
STRIPE_WEBHOOK_SECRET=""  # Leave empty for now
STRIPE_PRICE_BAND_MONTHLY=""  # Get after creating products
STRIPE_PRICE_BAND_YEARLY=""
STRIPE_PRICE_AGENT_MONTHLY=""
STRIPE_PRICE_AGENT_YEARLY=""
```

**Email:**
```env
RESEND_API_KEY=""  # Get from Resend
EMAIL_FROM="RehearSync <noreply@rehearsync.com>"
```

**AI:**
```env
REPLICATE_API_TOKEN=""  # Get from Replicate
REPLICATE_WEBHOOK_SECRET="$(openssl rand -hex 32)"
OPENAI_API_KEY=""  # Get from OpenAI
```

**WebSocket:**
```env
NEXT_PUBLIC_WS_URL="ws://localhost:3001"  # Will update later
WS_PORT="3001"
```

### Step 3: Upload Environment Variables to Vercel

```bash
# For each variable in .env.production
vercel env add VARIABLE_NAME production

# Or use the interactive script
npm run vercel:setup
```

**Important**: You'll need to add each variable one by one. This is tedious but necessary for security.

### Step 4: Deploy to Vercel

```bash
# Deploy to production
vercel --prod
```

Wait for deployment to complete (~2-3 minutes).

### Step 5: Get Your Deployment URL

```bash
# Get the deployment URL
vercel inspect
```

Copy the production URL (e.g., `rehearsync.vercel.app`)

---

## Phase 3: Configure Services (15 minutes)

### Stripe Setup

#### Create Products

1. Go to https://dashboard.stripe.com/products
2. Create **Band Monthly**:
   - Name: "Band Plan - Monthly"
   - Price: $29.99/month
   - Copy Price ID → Add to Vercel as `STRIPE_PRICE_BAND_MONTHLY`
3. Create **Band Yearly**:
   - Name: "Band Plan - Yearly"
   - Price: $299/year
   - Copy Price ID → Add to Vercel as `STRIPE_PRICE_BAND_YEARLY`
4. Create **Agent Monthly**:
   - Name: "Agent Plan - Monthly"
   - Price: $99.99/month
   - Copy Price ID → Add to Vercel as `STRIPE_PRICE_AGENT_MONTHLY`
5. Create **Agent Yearly**:
   - Name: "Agent Plan - Yearly"
   - Price: $999/year
   - Copy Price ID → Add to Vercel as `STRIPE_PRICE_AGENT_YEARLY`

#### Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Endpoint URL: `https://rehearsync.vercel.app/api/v1/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy **Signing secret** → Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### Resend Setup

1. Go to https://resend.com/api-keys
2. Click **Create API Key**
3. Copy key → Add to Vercel as `RESEND_API_KEY`
4. Go to **Domains** → Add your domain
5. Configure DNS records (SPF, DKIM)
6. For testing, use: `EMAIL_FROM="RehearSync <onboarding@resend.dev>"`

### Replicate Setup

1. Go to https://replicate.com/account/api-tokens
2. Click **Create token**
3. Copy token → Add to Vercel as `REPLICATE_API_TOKEN`
4. The webhook secret was generated earlier (`REPLICATE_WEBHOOK_SECRET`)

### OpenAI Setup

1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy key → Add to Vercel as `OPENAI_API_KEY`

### Update Vercel Deployment

After adding all environment variables:

```bash
# Redeploy to apply new environment variables
vercel --prod
```

---

## Phase 4: Deploy Supabase Edge Functions (10 minutes)

### Step 1: Link to Supabase Project

```bash
cd supabase
supabase link --project-ref [YOUR_PROJECT_REF]
```

Find your project ref in the Supabase dashboard URL:
`https://supabase.com/dashboard/project/[PROJECT_REF]`

### Step 2: Set Secrets

```bash
supabase secrets set REPLICATE_WEBHOOK_SECRET="your-secret-from-earlier"
supabase secrets set DATABASE_URL="your-database-url"
```

### Step 3: Deploy Edge Function

```bash
supabase functions deploy replicate-webhook --no-verify-jwt
```

### Step 4: Get Function URL

The function URL will be:
`https://[PROJECT_REF].supabase.co/functions/v1/replicate-webhook`

Save this URL - you'll need it for Replicate webhook configuration.

---

## Phase 5: Test Deployment (10 minutes)

### Health Checks

```bash
# Test Next.js health endpoint
curl https://rehearsync.vercel.app/health

# Should return:
# {"status":"ok","timestamp":"...","services":{"database":"connected"}}
```

### Smoke Tests

1. **Visit Homepage**: https://rehearsync.vercel.app
   - [ ] Loads without errors
   - [ ] Logo and images display
   - [ ] Navigation works

2. **Register Account**: https://rehearsync.vercel.app/register
   - [ ] Form submits successfully
   - [ ] Verification email received
   - [ ] Can click verification link

3. **Verify Email**: Check email and click link
   - [ ] Redirects to login
   - [ ] Shows success message

4. **Login**: https://rehearsync.vercel.app/login
   - [ ] Can sign in with credentials
   - [ ] Redirects to dashboard

5. **Dashboard**: https://rehearsync.vercel.app/dashboard
   - [ ] Shows welcome message
   - [ ] Can start onboarding

6. **Create Band**:
   - [ ] Onboarding wizard loads
   - [ ] Can add band name and members
   - [ ] Can proceed through steps

### Check Logs

```bash
# View Vercel logs
vercel logs --follow

# Check for errors
```

---

## Phase 6: Optional - Deploy WebSocket Server (10 minutes)

Choose one platform:

### Option A: Railway (Recommended)

1. Go to https://railway.app
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your repository
5. Railway auto-detects `railway.json`
6. Add environment variables in Railway dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
7. Click **Deploy**
8. Copy the public URL
9. Update `NEXT_PUBLIC_WS_URL` in Vercel to: `wss://your-railway-url.railway.app`
10. Redeploy Vercel: `vercel --prod`

### Option B: Render

1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Select your repository
4. Render auto-detects `render.yaml`
5. Add environment variables
6. Deploy
7. Copy URL and update Vercel

### Option C: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (creates app from fly.toml)
fly launch --no-deploy

# Set secrets
fly secrets set DATABASE_URL="..." NEXTAUTH_SECRET="..."

# Deploy
fly deploy

# Get URL
fly status
```

Update `NEXT_PUBLIC_WS_URL` in Vercel and redeploy.

---

## Phase 7: Configure Webhooks (5 minutes)

### Replicate Webhook

1. Go to https://replicate.com/account
2. Under **Webhooks**, add endpoint
3. URL: `https://[PROJECT_REF].supabase.co/functions/v1/replicate-webhook`
4. Secret: (use your `REPLICATE_WEBHOOK_SECRET`)

### Test Webhook

```bash
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/replicate-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Phase 8: Add Custom Domain (Optional, 5 minutes)

1. Go to Vercel dashboard
2. Select your project
3. Go to **Settings** → **Domains**
4. Add your domain (e.g., `app.rehearsync.com`)
5. Configure DNS:
   - **CNAME**: `cname.vercel-dns.com`
6. Wait for SSL certificate (auto-provisioned)
7. Update `NEXTAUTH_URL` in Vercel to your custom domain
8. Redeploy: `vercel --prod`

---

## Troubleshooting

### Build Fails

```bash
# Test build locally
npm run build

# Check for errors in output
```

### Database Connection Fails

```bash
# Test Prisma connection
npx prisma db pull

# Verify connection string format
```

### Email Not Sending

- Use Resend sandbox for testing: `onboarding@resend.dev`
- Verify domain in Resend dashboard
- Check DNS records (SPF, DKIM)

### Environment Variables Not Working

```bash
# Pull current values
vercel env pull .env.vercel

# Compare with .env.production
diff .env.production .env.vercel
```

---

## Post-Deployment Checklist

- [ ] Application accessible at production URL
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Can register new account
- [ ] Verification email received
- [ ] Can verify email and login
- [ ] Can create band and add members
- [ ] Database queries working
- [ ] Stripe webhooks configured
- [ ] Replicate webhooks configured
- [ ] Monitoring set up (optional but recommended)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

---

## Next Steps

1. **Set Up Monitoring**
   - Install Sentry: See `MONITORING_SETUP.md`
   - Configure UptimeRobot for `/health` endpoint

2. **Go Live**
   - Switch Stripe to live mode
   - Announce launch
   - Invite beta users

3. **Collect Feedback**
   - Monitor error logs
   - Track user behavior
   - Iterate based on feedback

---

## Quick Command Reference

```bash
# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# Rollback to previous deployment
vercel rollback

# Deploy Supabase functions
supabase functions deploy replicate-webhook

# Check Vercel environment variables
vercel env ls

# Pull environment variables
vercel env pull
```

---

## Support

**Need Help?**
- Check logs: `vercel logs --follow`
- Test health: `curl https://yourdomain.com/health`
- Review docs: `DEPLOYMENT.md`, `QUICK_DEPLOY.md`

---

**Total Deployment Time**: ~60 minutes (first time)  
**Subsequent Deployments**: ~2 minutes with `vercel --prod`

🚀 **You're ready to deploy!**
