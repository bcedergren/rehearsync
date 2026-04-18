#!/bin/bash

# Vercel setup script for RehearSync
# This script guides you through setting up environment variables in Vercel

set -e

echo "🚀 RehearSync Vercel Setup"
echo "=========================="
echo ""
echo "This script will help you set up environment variables in Vercel."
echo "Make sure you have the Vercel CLI installed: npm install -g vercel"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm install -g vercel"
    exit 1
fi

echo "✓ Vercel CLI found"
echo ""

# Check if already linked
if [ ! -f ".vercel/project.json" ]; then
    echo "Linking to Vercel project..."
    vercel link
else
    echo "✓ Already linked to Vercel project"
fi

echo ""
echo "Setting up environment variables..."
echo ""

# Read from .env.example
if [ ! -f ".env.example" ]; then
    echo "❌ .env.example not found"
    exit 1
fi

echo "Please provide values for the following environment variables:"
echo "(Press Enter to skip optional variables)"
echo ""

# Extract variable names from .env.example
VARS=$(grep -E "^[A-Z_]+=.*$" .env.example | cut -d'=' -f1)

for VAR in $VARS; do
    # Skip comments and empty lines
    if [[ $VAR =~ ^# ]] || [ -z "$VAR" ]; then
        continue
    fi
    
    # Get current value from .env.local if it exists
    CURRENT_VALUE=""
    if [ -f ".env.local" ]; then
        CURRENT_VALUE=$(grep "^$VAR=" .env.local | cut -d'=' -f2- | tr -d '"')
    fi
    
    # Prompt for value
    echo -n "$VAR"
    if [ -n "$CURRENT_VALUE" ]; then
        echo -n " [current: ${CURRENT_VALUE:0:20}...]: "
    else
        echo -n ": "
    fi
    
    read -r VALUE
    
    # Use current value if no new value provided
    if [ -z "$VALUE" ] && [ -n "$CURRENT_VALUE" ]; then
        VALUE="$CURRENT_VALUE"
    fi
    
    # Set in Vercel if value provided
    if [ -n "$VALUE" ]; then
        echo "Setting $VAR in Vercel..."
        vercel env add "$VAR" production <<< "$VALUE" > /dev/null 2>&1 || true
    fi
done

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: vercel --prod"
echo "2. Visit your deployment URL"
echo "3. Test the health endpoint: /health"
