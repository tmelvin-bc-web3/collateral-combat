#!/bin/bash
# Mainnet Deployment Script
# Usage: ./scripts/deploy-mainnet.sh [devnet|mainnet]

set -e

CLUSTER=${1:-devnet}

echo "========================================"
echo "DegenDome Deployment Script"
echo "Target cluster: $CLUSTER"
echo "========================================"

# Validate cluster argument
if [[ "$CLUSTER" != "devnet" && "$CLUSTER" != "mainnet" && "$CLUSTER" != "mainnet-beta" ]]; then
  echo "Error: Invalid cluster. Use 'devnet' or 'mainnet'"
  exit 1
fi

# Map mainnet to mainnet-beta for Solana CLI
if [[ "$CLUSTER" == "mainnet" ]]; then
  CLUSTER="mainnet-beta"
fi

echo ""
echo "Step 1: Pre-deployment checks..."
echo "--------------------------------"

# Check Solana CLI is installed
if ! command -v solana &> /dev/null; then
  echo "Error: Solana CLI not found. Install from https://docs.solana.com/cli/install-solana-cli-tools"
  exit 1
fi

# Check Anchor CLI is installed
if ! command -v anchor &> /dev/null; then
  echo "Error: Anchor CLI not found. Install from https://book.anchor-lang.com/getting_started/installation.html"
  exit 1
fi

# Check we're in the right directory
if [[ ! -d "programs/session_betting" ]]; then
  echo "Error: Run this script from the project root (where programs/ directory exists)"
  exit 1
fi

echo "✓ Solana CLI installed"
echo "✓ Anchor CLI installed"
echo "✓ Project structure verified"

echo ""
echo "Step 2: Check wallet balance..."
echo "--------------------------------"

BALANCE=$(solana balance --url $CLUSTER 2>/dev/null || echo "0")
echo "Current balance: $BALANCE"

# Extract number from balance string (handle "0.5 SOL" or "0.5")
BALANCE_NUM=$(echo $BALANCE | grep -oE '[0-9]+(\.[0-9]+)?' | head -1)

# Check if balance is sufficient (use bc for floating point comparison if available)
if command -v bc &> /dev/null; then
  if (( $(echo "$BALANCE_NUM < 5" | bc -l) )); then
    echo "Warning: Balance may be insufficient for deployment (need ~5 SOL)"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
      exit 1
    fi
  fi
else
  # Fallback: simple integer comparison if bc not available
  BALANCE_INT=${BALANCE_NUM%.*}
  if [[ $BALANCE_INT -lt 5 ]]; then
    echo "Warning: Balance may be insufficient for deployment (need ~5 SOL)"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
      exit 1
    fi
  fi
fi

echo ""
echo "Step 3: Build program..."
echo "------------------------"

cd programs/session_betting
anchor build

echo "✓ Program built successfully"

echo ""
echo "Step 4: Deploy program..."
echo "-------------------------"

if [[ "$CLUSTER" == "mainnet-beta" ]]; then
  echo "⚠️  MAINNET DEPLOYMENT"
  echo "This will deploy to mainnet-beta. Are you sure? (yes/no)"
  read -r response
  if [[ "$response" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

anchor deploy --provider.cluster $CLUSTER

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run ./scripts/verify-deployment.sh $CLUSTER"
echo "2. Initialize program state (if new deployment)"
echo "3. Update frontend/backend environment variables"
