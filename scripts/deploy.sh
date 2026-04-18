#!/bin/bash

# Main deployment script for RehearSync
# This orchestrates the entire deployment process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════╗
║   RehearSync Deployment Script       ║
╔═══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Parse arguments
ENVIRONMENT=${1:-production}
SKIP_CHECKS=${2:-false}

echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Pre-deployment checks
if [ "$SKIP_CHECKS" != "true" ]; then
    echo -e "${BLUE}Step 1: Running pre-deployment checks...${NC}"
    bash "$SCRIPT_DIR/pre-deploy-check.sh"
    echo ""
else
    echo -e "${YELLOW}Skipping pre-deployment checks${NC}"
    echo ""
fi

# Step 2: Confirm deployment
echo -e "${YELLOW}⚠️  You are about to deploy to $ENVIRONMENT${NC}"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 2: Checking required tools...${NC}"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗ Vercel CLI not found${NC}"
    echo "Install with: npm install -g vercel"
    exit 1
fi
echo -e "${GREEN}✓ Vercel CLI installed${NC}"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠ Supabase CLI not found (optional)${NC}"
    echo "Install with: brew install supabase/tap/supabase"
else
    echo -e "${GREEN}✓ Supabase CLI installed${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Building application...${NC}"
npm run build

echo ""
echo -e "${BLUE}Step 4: Deploying to Vercel...${NC}"

if [ "$ENVIRONMENT" == "production" ]; then
    vercel --prod --yes
else
    vercel --yes
fi

DEPLOYMENT_URL=$(vercel inspect --json | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "Deployment URL: https://$DEPLOYMENT_URL"
echo ""

# Step 5: Health check
echo -e "${BLUE}Step 5: Running health check...${NC}"
sleep 5  # Wait for deployment to be ready

HEALTH_URL="https://$DEPLOYMENT_URL/health"
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" || echo '{"status":"error"}')

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 6: Post-deployment tasks...${NC}"

echo "🔍 Verifying deployment..."
echo "  - Homepage: https://$DEPLOYMENT_URL"
echo "  - Health: https://$DEPLOYMENT_URL/health"
echo "  - API: https://$DEPLOYMENT_URL/api/v1/health"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

echo "Next steps:"
echo "1. Test the application at: https://$DEPLOYMENT_URL"
echo "2. Configure custom domain in Vercel dashboard"
echo "3. Set up Stripe webhooks pointing to: https://$DEPLOYMENT_URL/api/v1/stripe/webhook"
echo "4. Deploy Supabase Edge Functions (if needed): bash scripts/deploy-supabase-functions.sh"
echo "5. Deploy WebSocket server (if needed)"
echo ""
