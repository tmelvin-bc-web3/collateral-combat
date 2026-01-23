# Sol-Battles Multi-Sig Setup Guide

**Version:** 1.0
**Created:** 2026-01-23
**Last Updated:** 2026-01-23

This document provides comprehensive guidance for setting up and operating the Sol-Battles multi-sig authority using Squads Protocol v4.

---

## Table of Contents

1. [Configuration Rationale](#1-configuration-rationale)
2. [Prerequisites](#2-prerequisites)
3. [Setup Instructions](#3-setup-instructions)
4. [Multi-Sig Operations Runbook](#4-multi-sig-operations-runbook)
5. [Member Responsibilities](#5-member-responsibilities)
6. [Deployment Checklist](#6-deployment-checklist)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Configuration Rationale

### Why Squads Protocol

| Factor | Squads Protocol | Alternatives |
|--------|-----------------|--------------|
| **Security** | Formally verified | Standard audits only |
| **Track Record** | $10B+ secured | Limited adoption |
| **Adoption** | Industry standard (300+ teams) | Fragmented ecosystem |
| **UI** | Production-ready web interface | Often CLI-only |
| **Support** | Active development, documentation | Variable maintenance |

Squads Protocol is the clear choice for Solana multi-sig treasury and authority management. Formal verification provides mathematical proof of security properties.

### Why 2-of-3 Threshold

A 2-of-3 configuration provides optimal balance for small teams:

| Scenario | 2-of-3 | 3-of-3 | 2-of-2 |
|----------|--------|--------|--------|
| One key lost/compromised | Can still operate | Locked out | Locked out |
| Single point of failure | No | No | Yes |
| Operational flexibility | High | Low | High |
| Collusion resistance | 2 members needed | 3 members needed | 2 members needed |

**Recommendation:** 2-of-3 for small teams (2-5 people). Consider 3-of-5 for larger organizations.

### Why Immutable Configuration (configAuthority=null)

Setting `configAuthority=null` makes the multi-sig configuration immutable:

**Advantages:**
- Cannot be changed by compromised members
- No governance attacks possible
- Maximum security for mainnet

**Trade-offs:**
- Cannot add/remove members
- Cannot change threshold
- Must deploy new multi-sig if configuration change needed

**For Sol-Battles:** We use immutable configuration because:
1. Program authority rarely changes
2. Security is paramount for user funds
3. Members can be established before mainnet

If you need upgrade flexibility, set `configAuthority` to the multi-sig itself (allows threshold approval for config changes).

---

## 2. Prerequisites

### Software Requirements

```bash
# Node.js 18+
node --version  # Should be >= 18.0.0

# pnpm or npm
pnpm --version  # or npm --version

# Solana CLI (for verification)
solana --version
```

### Package Installation

```bash
# In the sol-battles root directory
npm install @sqds/multisig @solana/web3.js bs58 @coral-xyz/anchor
```

### RPC Access

| Network | RPC URL | Usage |
|---------|---------|-------|
| Devnet | `https://api.devnet.solana.com` | Testing |
| Mainnet | `https://api.mainnet-beta.solana.com` | Production |

For production, use a dedicated RPC provider (Helius, QuickNode, Triton) for reliability.

### Member Key Preparation

**CRITICAL:** All member keys should be from hardware wallets (Ledger, Trezor) for mainnet deployment.

Each member needs:
1. Hardware wallet set up
2. Solana wallet app installed
3. Public key exported

**Warning:** Do not use browser extension wallets for mainnet multi-sig members.

---

## 3. Setup Instructions

### Step 1: Devnet Testing (REQUIRED)

Always test on devnet first to verify the setup works.

```bash
# 1. Create test wallets
solana-keygen new -o ~/.config/solana/member1.json
solana-keygen new -o ~/.config/solana/member2.json
solana-keygen new -o ~/.config/solana/member3.json

# 2. Get public keys
solana address -k ~/.config/solana/member1.json
solana address -k ~/.config/solana/member2.json
solana address -k ~/.config/solana/member3.json

# 3. Fund creator wallet (airdrop on devnet)
solana airdrop 1 -u devnet

# 4. Run setup script
RPC_URL=https://api.devnet.solana.com \
CREATOR_PRIVATE_KEY=$(cat ~/.config/solana/id.json | jq -r '[.[]] | @base64' | base64 -d | xxd -p | xxd -r -p | base58) \
npx ts-node scripts/setup-multisig.ts \
  <member1-pubkey> <member2-pubkey> <member3-pubkey>

# 5. Save the output Multi-sig PDA address
```

### Step 2: Verify Multi-sig in Squads UI

1. Go to https://devnet.squads.so
2. Connect a member wallet
3. Find your multi-sig by PDA address
4. Verify:
   - All 3 members are listed
   - Threshold shows 2-of-3
   - Permissions are "All" for each member

### Step 3: Test Authority Transfer (Devnet)

```bash
# 1. Propose transfer
RPC_URL=https://api.devnet.solana.com \
SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<current-authority-key> \
npx ts-node scripts/transfer-authority-to-multisig.ts <multisig-pda>

# 2. Create acceptance transaction in Squads UI
# 3. Have 2 members approve
# 4. Execute the transaction
# 5. Verify authority changed on-chain
```

### Step 4: Mainnet Deployment

**Only proceed after successful devnet testing.**

```bash
# 1. Ensure all member keys are hardware wallets
# 2. Verify member public keys

# 3. Create multi-sig
RPC_URL=https://api.mainnet-beta.solana.com \
CREATOR_PRIVATE_KEY=<creator-key> \
npx ts-node scripts/setup-multisig.ts \
  <member1-hw-pubkey> <member2-hw-pubkey> <member3-hw-pubkey>

# 4. Verify in Squads UI (https://app.squads.so)

# 5. Transfer authority
RPC_URL=https://api.mainnet-beta.solana.com \
SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<current-authority-key> \
npx ts-node scripts/transfer-authority-to-multisig.ts <multisig-pda>

# 6. Complete acceptance in Squads UI
# 7. Secure/destroy old authority key
```

---

## 4. Multi-Sig Operations Runbook

### Operation: Credit Winnings Batch

Used by backend to pay out game winners. Requires multi-sig approval.

**When:** After batch of games settle
**Who initiates:** Backend service (programmatically or ops team)

```
1. Backend generates credit_winnings transactions
2. Transactions submitted to Squads as proposals
3. Members receive notification
4. 2 members approve in Squads UI
5. Backend executes approved transactions
```

**Squads UI Steps:**
1. Go to Transactions tab
2. Review pending credit_winnings proposal
3. Verify amounts and recipients
4. Click "Approve"
5. Second member approves
6. Click "Execute"

### Operation: Withdraw Platform Fees

Used to withdraw collected platform fees from global vault.

**When:** Monthly or as needed
**Who initiates:** Ops team

**Steps:**
1. Create transaction in Squads UI:
   - Program: `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`
   - Instruction: `withdraw_fees`
   - Amount: Desired withdrawal amount
   - Destination: Treasury wallet
2. Members approve (2-of-3)
3. Execute

**Safety Check:** Verify vault balance > outstanding liabilities before withdrawal.

### Operation: Pause/Unpause Game

Emergency action to pause all betting.

**When:** Security incident, bug discovered, maintenance
**Who initiates:** Any member with knowledge of issue

**Steps:**
1. Create transaction in Squads UI:
   - Instruction: `set_paused`
   - Argument: `true` (pause) or `false` (unpause)
2. Members approve (2-of-3)
3. Execute immediately

**Note:** For emergencies, coordinate via secure channel (Signal, encrypted email).

### Operation: Update Price Feed

Change the Pyth price feed ID (e.g., switch from devnet to mainnet feed).

**When:** Network migration, oracle upgrade
**Who initiates:** Tech lead

**Steps:**
1. Obtain new price feed ID from Pyth
2. Create transaction:
   - Instruction: `set_price_feed`
   - Argument: new 32-byte feed ID
3. Members approve (2-of-3)
4. Execute

---

## 5. Member Responsibilities

### Key Storage Requirements

| Requirement | Detail |
|-------------|--------|
| **Hardware wallet** | Ledger Nano S+, Nano X, or Trezor Model T |
| **Backup seed phrase** | Stored in secure, offline location |
| **No cloud backup** | Never store seed phrase in cloud services |
| **Unique device** | Do not share hardware wallet with other purposes |

### Response Time Expectations

| Priority | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | < 1 hour | Security incident, pause request |
| **High** | < 4 hours | Fee withdrawal, large payout batch |
| **Normal** | < 24 hours | Routine operations, small batches |

### Communication Channels

Establish secure communication channels for approval requests:

| Channel | Usage | Security Level |
|---------|-------|----------------|
| Signal (encrypted) | Emergency/critical | High |
| Slack (private channel) | Normal operations | Medium |
| Email (encrypted) | Documentation, non-urgent | Medium |

**Protocol:**
1. Initiator posts request with transaction details
2. Include: Transaction ID, action, amounts, deadline
3. Members acknowledge receipt
4. Approval status tracked until complete

### Availability Requirements

- At least 2 members must be reachable at all times
- Coordinate vacation/unavailability in advance
- Emergency contact information shared among all members
- Consider backup members for extended absences (requires new multi-sig)

---

## 6. Deployment Checklist

Use this checklist before mainnet deployment:

### Pre-Deployment

- [ ] All 3 member hardware wallets set up and tested
- [ ] Member public keys collected and verified
- [ ] Secure communication channel established
- [ ] Response time expectations agreed upon
- [ ] Emergency procedures documented

### Devnet Testing

- [ ] Multi-sig created on devnet
- [ ] All members verified access in Squads UI
- [ ] Test transaction approved and executed
- [ ] Authority transfer proposed
- [ ] Authority transfer accepted (2-of-3 approval)
- [ ] Post-transfer authority verified on-chain

### Mainnet Deployment

- [ ] Multi-sig created on mainnet
- [ ] Multi-sig PDA saved and backed up
- [ ] All members verified in Squads UI (mainnet)
- [ ] Test transaction approved and executed
- [ ] Authority transfer proposed
- [ ] All members notified of pending transfer
- [ ] Authority transfer accepted (2-of-3 approval)
- [ ] Authority transfer verified on-chain
- [ ] Old authority key secured or destroyed
- [ ] Monitoring set up for multi-sig transactions

### Post-Deployment

- [ ] Document multi-sig PDA in ops runbook
- [ ] Add multi-sig to team's Squads dashboard
- [ ] Test first production operation (e.g., fee withdrawal)
- [ ] Verify alert/notification system works

---

## 7. Troubleshooting

### Problem: Transaction Stuck in Pending

**Cause:** Not enough approvals
**Solution:**
1. Check number of approvals in Squads UI
2. Contact missing approvers
3. If member unavailable, coordinate with other members

### Problem: Member Cannot Access Squads UI

**Cause:** Wallet connection issue
**Solution:**
1. Ensure correct network selected (devnet vs mainnet)
2. Try different browser
3. Clear browser cache and reconnect wallet
4. Verify wallet has SOL for transaction fees

### Problem: Transaction Execution Fails

**Cause:** Various (insufficient funds, invalid accounts, etc.)
**Solution:**
1. Check error message in Squads UI
2. Verify all accounts exist and have correct balance
3. For `InsufficientVaultBalance`: Check global vault has funds
4. Create new transaction with corrected parameters

### Problem: Need to Change Multi-sig Configuration

**Cause:** Member change, threshold adjustment needed
**Solution:**
With `configAuthority=null` (immutable):
1. Create new multi-sig with desired configuration
2. Transfer authority to new multi-sig
3. Accept transfer with old multi-sig (2-of-3)
4. Verify transfer completed
5. Document new multi-sig PDA

### Emergency: Member Key Compromised

**Immediate Actions:**
1. Alert all other members via secure channel
2. Create `set_paused(true)` transaction immediately
3. Approve and execute pause (2-of-3 - compromised key cannot approve alone)
4. Assess situation:
   - If attacker cannot reach threshold: Monitor for suspicious proposals
   - If attacker might reach threshold: Transfer to new multi-sig ASAP

**Recovery:**
1. Create new multi-sig without compromised member
2. Transfer authority to new multi-sig
3. Document incident and update security procedures

---

## Warning

**Assign specific signers at deployment time. This document provides structure only.**

The member public keys used in examples are placeholders. Replace with actual hardware wallet addresses before mainnet deployment.

---

## References

- [Squads Protocol Documentation](https://docs.squads.so)
- [Squads Protocol GitHub](https://github.com/Squads-Protocol/v4)
- [Sol-Battles Contract Audit](../.planning/audits/CONTRACT-AUDIT.md)
- [Sol-Battles Security Audit Report](./SECURITY-AUDIT-REPORT.md)
