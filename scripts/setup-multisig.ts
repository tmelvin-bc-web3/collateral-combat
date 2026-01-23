/**
 * Sol-Battles Multi-Sig Setup Script
 *
 * Creates a Squads Protocol v4 multi-sig for program authority management.
 *
 * SECURITY RATIONALE:
 * - 2-of-3 threshold: Allows one key loss while maintaining security
 *   (no single point of failure, but doesn't require all members for every action)
 * - configAuthority=null: Immutable configuration for maximum security
 *   (cannot change threshold or members after creation - intentional)
 * - No time-lock: Operational flexibility for authority actions
 *
 * REQUIRED PACKAGES:
 * npm install @sqds/multisig @solana/web3.js bs58
 *
 * USAGE:
 * # Devnet (test first!)
 * RPC_URL=https://api.devnet.solana.com npx ts-node scripts/setup-multisig.ts \
 *   <member1-pubkey> <member2-pubkey> <member3-pubkey>
 *
 * # Mainnet
 * RPC_URL=https://api.mainnet-beta.solana.com npx ts-node scripts/setup-multisig.ts \
 *   <member1-pubkey> <member2-pubkey> <member3-pubkey>
 *
 * IMPORTANT:
 * - Run on DEVNET first to verify setup works
 * - All member public keys should be from HARDWARE WALLETS for mainnet
 * - Save the output multi-sig PDA address - needed for authority transfer
 * - The create key is ephemeral and doesn't need to be saved
 *
 * @author Sol-Battles Team
 * @created 2026-01-23
 * @security Formal verification via Squads Protocol ($10B+ secured)
 */

import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as bs58 from "bs58";

// ===================
// Configuration
// ===================

/**
 * Multi-sig threshold: Number of approvals required to execute a transaction.
 * 2-of-3 is recommended for small teams:
 * - Allows operations to continue if one member is unavailable
 * - Prevents single-point-of-failure attacks
 * - Standard security practice for treasury management
 */
const THRESHOLD = 2;

/**
 * Expected number of members in the multi-sig.
 * Must match the number of member public keys provided.
 */
const MEMBER_COUNT = 3;

// ===================
// Helper Functions
// ===================

function printUsage(): void {
  console.log(`
Usage: RPC_URL=<rpc-url> CREATOR_PRIVATE_KEY=<base58-key> npx ts-node scripts/setup-multisig.ts <member1> <member2> <member3>

Environment Variables:
  RPC_URL                 Solana RPC URL (required)
                          Devnet: https://api.devnet.solana.com
                          Mainnet: https://api.mainnet-beta.solana.com

  CREATOR_PRIVATE_KEY     Base58 encoded private key of the creator wallet (required)
                          This wallet pays for the transaction and rent

Arguments:
  member1, member2, member3   Public keys of multi-sig members (required)
                              These should be hardware wallet addresses for mainnet

Example (devnet):
  RPC_URL=https://api.devnet.solana.com \\
  CREATOR_PRIVATE_KEY=<your-private-key> \\
  npx ts-node scripts/setup-multisig.ts \\
    9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM \\
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \\
    So11111111111111111111111111111111111111112

Output:
  Multi-sig PDA address to use in transfer-authority-to-multisig.ts
`);
}

function validatePublicKey(key: string, name: string): PublicKey {
  try {
    return new PublicKey(key);
  } catch {
    throw new Error(`Invalid public key for ${name}: ${key}`);
  }
}

// ===================
// Main Script
// ===================

async function main(): Promise<void> {
  console.log("===========================================");
  console.log("Sol-Battles Multi-Sig Setup");
  console.log("Squads Protocol v4 - 2-of-3 Configuration");
  console.log("===========================================\n");

  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length !== MEMBER_COUNT) {
    console.error(`Error: Expected ${MEMBER_COUNT} member public keys, got ${args.length}\n`);
    printUsage();
    process.exit(1);
  }

  // Validate environment variables
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("Error: RPC_URL environment variable is required\n");
    printUsage();
    process.exit(1);
  }

  const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;
  if (!creatorPrivateKey) {
    console.error("Error: CREATOR_PRIVATE_KEY environment variable is required\n");
    printUsage();
    process.exit(1);
  }

  // Parse creator keypair
  let creator: Keypair;
  try {
    const secretKey = bs58.decode(creatorPrivateKey);
    creator = Keypair.fromSecretKey(secretKey);
  } catch {
    console.error("Error: Invalid CREATOR_PRIVATE_KEY - must be base58 encoded\n");
    process.exit(1);
  }

  // Validate member public keys
  const memberPubkeys: PublicKey[] = [];
  for (let i = 0; i < args.length; i++) {
    const pubkey = validatePublicKey(args[i], `member${i + 1}`);
    memberPubkeys.push(pubkey);
  }

  // Check for duplicate members
  const uniqueKeys = new Set(memberPubkeys.map((k) => k.toBase58()));
  if (uniqueKeys.size !== memberPubkeys.length) {
    console.error("Error: Duplicate member public keys detected\n");
    process.exit(1);
  }

  // Determine network
  const isMainnet = rpcUrl.includes("mainnet");
  const network = isMainnet ? "MAINNET" : "DEVNET";

  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Creator: ${creator.publicKey.toBase58()}`);
  console.log(`Threshold: ${THRESHOLD}-of-${MEMBER_COUNT}`);
  console.log("\nMembers:");
  memberPubkeys.forEach((key, i) => {
    console.log(`  ${i + 1}. ${key.toBase58()}`);
  });

  // MAINNET WARNING
  if (isMainnet) {
    console.log("\n" + "!".repeat(60));
    console.log("WARNING: You are deploying to MAINNET!");
    console.log("- Ensure all member keys are from HARDWARE WALLETS");
    console.log("- configAuthority=null means NO CHANGES after creation");
    console.log("- Verify all member addresses are correct BEFORE proceeding");
    console.log("!".repeat(60));
    console.log("\nProceeding in 5 seconds... (Ctrl+C to cancel)");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Connect to cluster
  console.log("\nConnecting to Solana cluster...");
  const connection = new Connection(rpcUrl, "confirmed");

  // Check creator balance
  const creatorBalance = await connection.getBalance(creator.publicKey);
  const requiredBalance = 0.01 * LAMPORTS_PER_SOL; // ~0.01 SOL for rent and tx fee
  if (creatorBalance < requiredBalance) {
    console.error(
      `Error: Creator wallet has insufficient balance: ${creatorBalance / LAMPORTS_PER_SOL} SOL`
    );
    console.error(`Required: ~0.01 SOL for rent and transaction fees`);
    process.exit(1);
  }
  console.log(`Creator balance: ${creatorBalance / LAMPORTS_PER_SOL} SOL`);

  // Generate create key for PDA derivation
  // This is ephemeral - only used once to derive the multi-sig PDA
  const createKey = Keypair.generate();

  // Derive multi-sig PDA
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  console.log("\nDerived addresses:");
  console.log(`  Create Key (ephemeral): ${createKey.publicKey.toBase58()}`);
  console.log(`  Multi-sig PDA: ${multisigPda.toBase58()}`);

  // Build member permissions
  // All members get full permissions (Proposer, Voter, Executor)
  const members = memberPubkeys.map((key) => ({
    key,
    permissions: multisig.types.Permissions.all(),
  }));

  // Create the multi-sig
  console.log("\nCreating multi-sig...");
  try {
    const signature = await multisig.rpc.multisigCreate({
      connection,
      createKey,
      creator,
      multisigPda,
      configAuthority: null, // IMMUTABLE - no changes after creation (max security)
      threshold: THRESHOLD,
      members,
      timeLock: 0, // No time-lock for operational flexibility
      // Note: Rent exemption is handled automatically
    });

    console.log("\n" + "=".repeat(60));
    console.log("SUCCESS: Multi-sig created!");
    console.log("=".repeat(60));
    console.log(`\nTransaction signature: ${signature}`);
    console.log(`Multi-sig PDA: ${multisigPda.toBase58()}`);
    console.log(`\nExplorer link:`);
    if (isMainnet) {
      console.log(`  https://explorer.solana.com/tx/${signature}`);
      console.log(`  https://explorer.solana.com/address/${multisigPda.toBase58()}`);
    } else {
      console.log(`  https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      console.log(
        `  https://explorer.solana.com/address/${multisigPda.toBase58()}?cluster=devnet`
      );
    }

    console.log("\n" + "-".repeat(60));
    console.log("NEXT STEPS:");
    console.log("-".repeat(60));
    console.log("\n1. Save the Multi-sig PDA address above");
    console.log("\n2. Verify members in Squads UI:");
    if (isMainnet) {
      console.log(`   https://app.squads.so/squads/${multisigPda.toBase58()}/home`);
    } else {
      console.log(`   https://devnet.squads.so/squads/${multisigPda.toBase58()}/home`);
    }
    console.log("\n3. Run the authority transfer script:");
    console.log(`   npx ts-node scripts/transfer-authority-to-multisig.ts ${multisigPda.toBase58()}`);
    console.log("\n4. Multi-sig members approve the authority transfer via Squads UI");
  } catch (error) {
    console.error("\nError creating multi-sig:", error);
    process.exit(1);
  }
}

main().catch(console.error);
