#!/bin/bash
# Deployment Verification Script
# Usage: ./scripts/verify-deployment.sh [devnet|mainnet]

set -e

CLUSTER=${1:-devnet}
PROGRAM_ID="4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA"

echo "========================================"
echo "DegenDome Deployment Verification"
echo "Cluster: $CLUSTER"
echo "Program: $PROGRAM_ID"
echo "========================================"

# Map mainnet to mainnet-beta
if [[ "$CLUSTER" == "mainnet" ]]; then
  CLUSTER="mainnet-beta"
fi

ERRORS=0

echo ""
echo "1. Checking program deployment..."
echo "---------------------------------"

if solana program show $PROGRAM_ID --url $CLUSTER &> /dev/null; then
  echo "✓ Program deployed and accessible"
  solana program show $PROGRAM_ID --url $CLUSTER | head -5
else
  echo "✗ Program not found or not accessible"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "2. Checking backend health..."
echo "-----------------------------"

# Determine backend URL based on cluster
if [[ "$CLUSTER" == "mainnet-beta" ]]; then
  BACKEND_URL="https://api.degendome.xyz"
else
  BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
fi

echo "Backend URL: $BACKEND_URL"

# Check liveness
if curl -s -f "$BACKEND_URL/livez" > /dev/null 2>&1; then
  echo "✓ Backend liveness check passed"
else
  echo "✗ Backend liveness check failed"
  ERRORS=$((ERRORS + 1))
fi

# Check readiness
READY_RESPONSE=$(curl -s "$BACKEND_URL/readyz" 2>/dev/null || echo '{"status":"error"}')
READY_STATUS=$(echo $READY_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [[ "$READY_STATUS" == "ready" ]]; then
  echo "✓ Backend readiness check passed"
else
  echo "✗ Backend readiness check failed: $READY_STATUS"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "3. Checking frontend..."
echo "-----------------------"

if [[ "$CLUSTER" == "mainnet-beta" ]]; then
  FRONTEND_URL="https://degendome.xyz"
else
  FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
fi

echo "Frontend URL: $FRONTEND_URL"

if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
  echo "✓ Frontend accessible"
else
  echo "✗ Frontend not accessible (may be expected for localhost)"
  # Don't count as error for non-mainnet
  if [[ "$CLUSTER" == "mainnet-beta" ]]; then
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
echo "4. Checking metrics endpoint..."
echo "-------------------------------"

METRICS_RESPONSE=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null || echo '{}')
if echo $METRICS_RESPONSE | grep -q "uptime"; then
  echo "✓ Metrics endpoint responding"
else
  echo "⚠ Metrics endpoint may require authentication"
fi

echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"

if [[ $ERRORS -eq 0 ]]; then
  echo "✓ All checks passed!"
  exit 0
else
  echo "✗ $ERRORS check(s) failed"
  echo ""
  echo "Please review the errors above and fix before proceeding."
  exit 1
fi
