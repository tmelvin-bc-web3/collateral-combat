/**
 * Sol-Battles Authority Transfer Script
 *
 * Proposes authority transfer from the current single-key authority to a Squads multi-sig.
 * This is a TWO-STEP process for security:
 *
 * Step 1 (this script): Current authority calls propose_authority_transfer(multisigPda)
 * Step 2 (Squads UI): Multi-sig members vote and execute accept_authority_transfer
 *
 * SECURITY RATIONALE:
 * - Two-step transfer prevents accidental lockout
 * - Only pending authority can accept (prevents hijacking)
 * - Multi-sig must be active before transfer (can't transfer to invalid address)
 *
 * REQUIRED PACKAGES:
 * npm install @coral-xyz/anchor @solana/web3.js bs58
 *
 * USAGE:
 * # Step 1: Propose transfer (this script)
 * RPC_URL=https://api.devnet.solana.com \
 * SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<current-authority-key> \
 * npx ts-node scripts/transfer-authority-to-multisig.ts <multisig-pda>
 *
 * # Step 2: Accept transfer (via Squads UI)
 * 1. Go to https://app.squads.so/squads/<multisig-pda>/transactions
 * 2. Create transaction calling accept_authority_transfer on session_betting program
 * 3. Members approve (2-of-3 required)
 * 4. Execute transaction
 *
 * IMPORTANT:
 * - Run on DEVNET first to verify the flow works
 * - The current authority keypair is loaded from SESSION_BETTING_AUTHORITY_PRIVATE_KEY
 * - After transfer completes, the old authority key can be secured/destroyed
 * - Multi-sig PDA becomes the new authority - all admin actions require multi-sig approval
 *
 * @author Sol-Battles Team
 * @created 2026-01-23
 * @security Two-step transfer pattern prevents accidental lockout
 */

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import * as bs58 from "bs58";

// ===================
// Program Configuration
// ===================

/**
 * Session Betting Program ID (deployed to devnet)
 * Update this for mainnet deployment
 */
const PROGRAM_ID = new PublicKey("4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA");

/**
 * Minimal IDL for authority transfer instructions
 * Only includes the instructions we need
 */
const SESSION_BETTING_IDL = {
  version: "0.1.0",
  name: "session_betting",
  instructions: [
    {
      name: "proposeAuthorityTransfer",
      accounts: [
        { name: "gameState", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [{ name: "newAuthority", type: "publicKey" }],
    },
    {
      name: "cancelAuthorityTransfer",
      accounts: [
        { name: "gameState", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [],
    },
  ],
};

// ===================
// Helper Functions
// ===================

function printUsage(): void {
  console.log(`
Usage: RPC_URL=<rpc-url> SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<key> npx ts-node scripts/transfer-authority-to-multisig.ts <multisig-pda>

Environment Variables:
  RPC_URL                               Solana RPC URL (required)
  SESSION_BETTING_AUTHORITY_PRIVATE_KEY Base58 private key of CURRENT authority (required)

Arguments:
  multisig-pda    The Squads multi-sig PDA address (from setup-multisig.ts output)

Example (devnet):
  RPC_URL=https://api.devnet.solana.com \\
  SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<your-authority-key> \\
  npx ts-node scripts/transfer-authority-to-multisig.ts \\
    SquADSPda1234567890abcdefghijklmnopqrstuv

Two-Step Transfer Process:
  1. This script proposes the transfer (requires current authority signature)
  2. Multi-sig members accept via Squads UI (requires threshold approval)
`);
}

function validatePublicKey(key: string, name: string): PublicKey {
  try {
    return new PublicKey(key);
  } catch {
    throw new Error(`Invalid public key for ${name}: ${key}`);
  }
}

/**
 * Get the Game State PDA
 */
function getGameStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("game")], PROGRAM_ID);
}

// ===================
// Main Script
// ===================

async function main(): Promise<void> {
  console.log("===========================================");
  console.log("Sol-Battles Authority Transfer");
  console.log("Propose Transfer to Multi-sig");
  console.log("===========================================\n");

  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error("Error: Expected 1 argument (multisig PDA)\n");
    printUsage();
    process.exit(1);
  }

  const multisigPda = validatePublicKey(args[0], "multisig-pda");

  // Validate environment variables
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("Error: RPC_URL environment variable is required\n");
    printUsage();
    process.exit(1);
  }

  const authorityPrivateKey = process.env.SESSION_BETTING_AUTHORITY_PRIVATE_KEY;
  if (!authorityPrivateKey) {
    console.error("Error: SESSION_BETTING_AUTHORITY_PRIVATE_KEY environment variable is required\n");
    printUsage();
    process.exit(1);
  }

  // Parse authority keypair
  let authority: Keypair;
  try {
    const secretKey = bs58.decode(authorityPrivateKey);
    authority = Keypair.fromSecretKey(secretKey);
  } catch {
    console.error("Error: Invalid SESSION_BETTING_AUTHORITY_PRIVATE_KEY - must be base58 encoded\n");
    process.exit(1);
  }

  // Determine network
  const isMainnet = rpcUrl.includes("mainnet");
  const network = isMainnet ? "MAINNET" : "DEVNET";

  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Current Authority: ${authority.publicKey.toBase58()}`);
  console.log(`New Authority (Multi-sig): ${multisigPda.toBase58()}`);
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);

  // MAINNET WARNING
  if (isMainnet) {
    console.log("\n" + "!".repeat(60));
    console.log("WARNING: You are transferring authority on MAINNET!");
    console.log("- This action is IRREVERSIBLE after the multi-sig accepts");
    console.log("- Ensure the multi-sig PDA is correct and members are set up");
    console.log("- Test the multi-sig can sign transactions BEFORE accepting");
    console.log("!".repeat(60));
    console.log("\nProceeding in 10 seconds... (Ctrl+C to cancel)");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  // Connect to cluster
  console.log("\nConnecting to Solana cluster...");
  const connection = new Connection(rpcUrl, "confirmed");

  // Verify multi-sig account exists
  const multisigAccount = await connection.getAccountInfo(multisigPda);
  if (!multisigAccount) {
    console.error("\nError: Multi-sig PDA does not exist on chain");
    console.error("Did you run setup-multisig.ts first?");
    process.exit(1);
  }
  console.log(`Multi-sig account verified (${multisigAccount.data.length} bytes)`);

  // Set up Anchor provider
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Create program interface
  // @ts-ignore - IDL type mismatch is expected with minimal IDL
  const program = new Program(SESSION_BETTING_IDL, PROGRAM_ID, provider);

  // Get game state PDA
  const [gameStatePda] = getGameStatePda();
  console.log(`Game State PDA: ${gameStatePda.toBase58()}`);

  // Verify game state exists and authority matches
  const gameStateAccount = await connection.getAccountInfo(gameStatePda);
  if (!gameStateAccount) {
    console.error("\nError: Game State PDA does not exist");
    console.error("Has the program been initialized?");
    process.exit(1);
  }

  // Verify authority (read first 32 bytes after 8-byte discriminator)
  const currentAuthority = new PublicKey(gameStateAccount.data.slice(8, 40));
  if (!currentAuthority.equals(authority.publicKey)) {
    console.error("\nError: Authority mismatch!");
    console.error(`  Expected: ${authority.publicKey.toBase58()}`);
    console.error(`  On-chain: ${currentAuthority.toBase58()}`);
    console.error("\nYour private key does not match the current program authority.");
    process.exit(1);
  }
  console.log("Authority verified - you are the current authority");

  // Check if there's already a pending authority
  const pendingAuthorityOpt = gameStateAccount.data.slice(40, 41)[0];
  if (pendingAuthorityOpt === 1) {
    const pendingAuthority = new PublicKey(gameStateAccount.data.slice(41, 73));
    console.log(`\nWarning: There is already a pending authority: ${pendingAuthority.toBase58()}`);
    console.log("This will be overwritten if you continue.");
    console.log("\nContinuing in 5 seconds... (Ctrl+C to cancel)");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Propose authority transfer
  console.log("\nProposing authority transfer...");
  try {
    const tx = await program.methods
      .proposeAuthorityTransfer(multisigPda)
      .accounts({
        gameState: gameStatePda,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("\n" + "=".repeat(60));
    console.log("SUCCESS: Authority transfer proposed!");
    console.log("=".repeat(60));
    console.log(`\nTransaction signature: ${tx}`);
    console.log(`\nExplorer link:`);
    if (isMainnet) {
      console.log(`  https://explorer.solana.com/tx/${tx}`);
    } else {
      console.log(`  https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    }

    console.log("\n" + "-".repeat(60));
    console.log("NEXT STEPS:");
    console.log("-".repeat(60));
    console.log("\n1. Open Squads UI:");
    if (isMainnet) {
      console.log(`   https://app.squads.so/squads/${multisigPda.toBase58()}/transactions`);
    } else {
      console.log(`   https://devnet.squads.so/squads/${multisigPda.toBase58()}/transactions`);
    }

    console.log("\n2. Create a new transaction with:");
    console.log(`   - Program: ${PROGRAM_ID.toBase58()}`);
    console.log("   - Instruction: accept_authority_transfer");
    console.log(`   - Accounts:`);
    console.log(`     - gameState (mut): ${gameStatePda.toBase58()}`);
    console.log(`     - newAuthority (signer): ${multisigPda.toBase58()}`);

    console.log("\n3. Multi-sig members approve (2-of-3 required)");

    console.log("\n4. Execute the transaction");

    console.log("\n5. Verify transfer completed:");
    console.log("   The game state authority should now be the multi-sig PDA");

    console.log("\n" + "!".repeat(60));
    console.log("IMPORTANT: Until step 4 is complete, current authority still works");
    console.log("To cancel: run cancel_authority_transfer with current authority");
    console.log("!".repeat(60));
  } catch (error) {
    console.error("\nError proposing authority transfer:", error);
    process.exit(1);
  }
}

main().catch(console.error);
