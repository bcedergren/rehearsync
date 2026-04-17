# Deployment Scripts

Automated deployment scripts for RehearSync.

---

## Available Scripts

### `deploy.sh`

Main deployment orchestration script.

```bash
# Deploy to production
npm run deploy

# Or directly
bash scripts/deploy.sh production

# Deploy to staging
npm run deploy:staging
```

**What it does:**
1. Runs pre-deployment checks
2. Builds the application
3. Deploys to Vercel
4. Runs health checks
5. Displays post-deployment instructions

---

### `pre-deploy-check.sh`

Pre-deployment verification script.

```bash
# Run checks before deploying
npm run deploy:check

# Or directly
bash scripts/pre-deploy-check.sh
```

**Checks:**
- Node.js version (≥18)
- Dependencies installed
- Tests passing
- Build successful
- Environment configuration
- Prisma schema valid
- Package.json scripts
- Debug statements count
- TODO/FIXME comments

**Exit codes:**
- `0` - All checks passed
- `1` - One or more checks failed

---

### `setup-vercel.sh`

Interactive Vercel environment setup.

```bash
# Set up environment variables in Vercel
npm run vercel:setup

# Or directly
bash scripts/setup-vercel.sh
```

**What it does:**
1. Links to Vercel project (if not already linked)
2. Reads variables from `.env.example`
3. Prompts for each variable value
4. Sets variables in Vercel for production environment

**Prerequisites:**
- Vercel CLI installed (`npm install -g vercel`)
- Vercel account created

---

### `deploy-supabase-functions.sh`

Deploy Supabase Edge Functions.

```bash
# Deploy Edge Functions
npm run deploy:supabase

# Or directly
bash scripts/deploy-supabase-functions.sh
```

**What it does:**
1. Links to Supabase project (if not already linked)
2. Prompts for required secrets
3. Sets secrets in Supabase
4. Deploys `replicate-webhook` function

**Prerequisites:**
- Supabase CLI installed
- Supabase project created

---

## Usage Examples

### First-Time Deployment

```bash
# 1. Run pre-deployment checks
npm run deploy:check

# 2. Set up Vercel environment variables
npm run vercel:setup

# 3. Deploy Supabase Edge Functions
npm run deploy:supabase

# 4. Deploy to Vercel
npm run deploy
```

### Subsequent Deployments

```bash
# Quick deploy (skips setup)
npm run deploy
```

### CI/CD Pipeline

```bash
# Run in GitHub Actions
npm run deploy:check  # Verification
npm run deploy production  # Automated deployment
```

---

## Script Dependencies

All scripts require:
- `bash` shell
- `npm` installed
- Project dependencies installed (`npm install`)

Individual script requirements:

| Script | Additional Requirements |
|--------|------------------------|
| `deploy.sh` | Vercel CLI |
| `setup-vercel.sh` | Vercel CLI |
| `deploy-supabase-functions.sh` | Supabase CLI |
| `pre-deploy-check.sh` | None |

---

## Environment Variables

Scripts may reference these environment variables:

- `NODE_ENV` - Set to `production` for production deployments
- `SKIP_ENV_VALIDATION` - Set to `true` to skip env validation during build
- All variables from `.env.example`

---

## Exit Codes

All scripts follow standard exit codes:

- `0` - Success
- `1` - General error
- `2` - Missing dependencies
- `3` - Configuration error

---

## Troubleshooting

### "vercel: command not found"

Install Vercel CLI:
```bash
npm install -g vercel
```

### "supabase: command not found"

Install Supabase CLI:
```bash
# macOS
brew install supabase/tap/supabase

# Other platforms
npm install -g supabase
```

### Pre-deployment checks fail

Read the error messages and fix issues:
```bash
npm run deploy:check
```

Common fixes:
- Install dependencies: `npm install`
- Fix failing tests: `npm test`
- Fix build errors: `npm run build`
- Update environment variables

### Permission denied

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

---

## Adding New Scripts

To add a new deployment script:

1. Create script in `scripts/` directory
2. Add shebang: `#!/bin/bash`
3. Set error handling: `set -e`
4. Make executable: `chmod +x scripts/your-script.sh`
5. Add npm script in `package.json`
6. Document in this README

Example:

```bash
#!/bin/bash
set -e

echo "Running custom task..."
# Your code here
echo "✅ Task complete"
```

---

## Security Notes

- Never commit `.env` or `.env.local` files
- Scripts prompt for sensitive values (not hardcoded)
- Vercel encrypts environment variables
- Supabase secrets are encrypted at rest
- Use `.gitignore` for local environment files

---

## Continuous Integration

These scripts are designed to work in CI/CD pipelines:

**GitHub Actions** (`.github/workflows/ci.yml`):
```yaml
- name: Pre-deployment check
  run: npm run deploy:check

- name: Deploy to Vercel
  run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**GitLab CI**:
```yaml
deploy:
  script:
    - npm run deploy:check
    - npm run deploy
```

---

For detailed deployment instructions, see:
- `QUICK_DEPLOY.md` - 30-minute quick start
- `DEPLOYMENT.md` - Comprehensive deployment guide
