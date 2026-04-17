#!/bin/bash

# Deploy Supabase Edge Functions for RehearSync

set -e

echo "📦 Deploying Supabase Edge Functions"
echo "====================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   brew install supabase/tap/supabase  (macOS)"
    echo "   npm install -g supabase             (Other platforms)"
    exit 1
fi

echo "✓ Supabase CLI found"
echo ""

# Check if linked to project
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "Linking to Supabase project..."
    echo "You'll need your project reference (found in Supabase dashboard URL)"
    echo ""
    cd supabase
    supabase link
    cd ..
else
    echo "✓ Already linked to Supabase project"
    PROJECT_REF=$(cat supabase/.temp/project-ref)
    echo "  Project: $PROJECT_REF"
fi

echo ""
echo "Setting Edge Function secrets..."
echo ""

# Prompt for required secrets
echo -n "REPLICATE_WEBHOOK_SECRET: "
read -rs REPLICATE_SECRET
echo ""

echo -n "DATABASE_URL: "
read -rs DATABASE_URL
echo ""

# Set secrets
echo "Setting secrets in Supabase..."
supabase secrets set REPLICATE_WEBHOOK_SECRET="$REPLICATE_SECRET" > /dev/null 2>&1
supabase secrets set DATABASE_URL="$DATABASE_URL" > /dev/null 2>&1

echo "✓ Secrets set"
echo ""

# Deploy function
echo "Deploying replicate-webhook function..."
supabase functions deploy replicate-webhook --no-verify-jwt

echo ""
echo "✅ Edge Functions deployed successfully!"
echo ""
echo "Function URL: https://$PROJECT_REF.supabase.co/functions/v1/replicate-webhook"
echo ""
echo "Next steps:"
echo "1. Configure this URL in Replicate dashboard as webhook endpoint"
echo "2. Test webhook: curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/replicate-webhook -d '{\"test\":true}'"
