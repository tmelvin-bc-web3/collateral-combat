/**
 * Battle Contract Test Script
 * Tests the full flow: initialize → create battle → (join) → settle → claim
 *
 * Usage:
 *   npx ts-node scripts/test-battle-contract.ts
 *
 * Prerequisites:
 *   - Solana CLI configured with devnet
 *   - Wallet with at least 0.5 SOL on devnet
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// Load IDL
const idlPath = path.join(__dirname, '../web/src/lib/battle/battle_program.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

const BATTLE_PROGRAM_ID = new PublicKey('GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9');

// PDA Seeds
const CONFIG_SEED = Buffer.from('config');
const BATTLE_SEED = Buffer.from('battle');
const ESCROW_SEED = Buffer.from('escrow');

// Helper functions
function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], BATTLE_PROGRAM_ID);
}

function getBattlePDA(battleId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BATTLE_SEED, battleId.toArrayLike(Buffer, 'le', 8)],
    BATTLE_PROGRAM_ID
  );
}

function getEscrowPDA(battleId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_SEED, battleId.toArrayLike(Buffer, 'le', 8)],
    BATTLE_PROGRAM_ID
  );
}

async function main() {
  console.log('🎮 Battle Contract Test Script\n');
  console.log('='.repeat(50));

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✓ Connected to devnet');

  // Load wallet from Solana CLI config
  const keypairPath = `${process.env.HOME}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log(`✓ Wallet: ${wallet.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`✓ Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.2 * LAMPORTS_PER_SOL) {
    console.error('\n❌ Insufficient balance. Need at least 0.2 SOL on devnet');
    console.log('   Run: solana airdrop 1 --url devnet');
    process.exit(1);
  }

  // Create provider
  const anchorWallet = new Wallet(wallet);
  const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Check/Initialize Config\n');

  const [configPDA] = getConfigPDA();
  console.log(`Config PDA: ${configPDA.toBase58()}`);

  let configAccount = await connection.getAccountInfo(configPDA);

  if (!configAccount) {
    console.log('Config not initialized. Initializing...');
    try {
      const tx = await (program.methods as any)
        .initialize()
        .accounts({
          config: configPDA,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc();
      console.log(`✓ Initialized! Tx: ${tx}`);

      // Wait and refetch
      await new Promise(r => setTimeout(r, 2000));
      configAccount = await connection.getAccountInfo(configPDA);
    } catch (err: any) {
      console.error('❌ Initialize failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('✓ Config already initialized');
  }

  // Fetch config data
  const config = await (program.account as any).config.fetch(configPDA);
  console.log(`  Authority: ${config.authority.toBase58()}`);
  console.log(`  Total Battles: ${config.totalBattles.toString()}`);
  console.log(`  Total Volume: ${config.totalVolume.toString()} lamports`);

  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Create Battle\n');

  const battleId = config.totalBattles;
  const [battlePDA] = getBattlePDA(battleId);
  const [escrowPDA] = getEscrowPDA(battleId);
  const entryFee = new BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL

  console.log(`Creating battle #${battleId.toString()}`);
  console.log(`  Battle PDA: ${battlePDA.toBase58()}`);
  console.log(`  Escrow PDA: ${escrowPDA.toBase58()}`);
  console.log(`  Entry Fee: 0.1 SOL`);

  try {
    const tx = await (program.methods as any)
      .createBattle(entryFee)
      .accounts({
        config: configPDA,
        battle: battlePDA,
        escrow: escrowPDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log(`✓ Battle created! Tx: ${tx}`);
  } catch (err: any) {
    console.error('❌ Create battle failed:', err.message);
    if (err.logs) {
      console.log('Logs:', err.logs.join('\n'));
    }
    process.exit(1);
  }

  // Wait and fetch battle
  await new Promise(r => setTimeout(r, 2000));
  const battle = await (program.account as any).battle.fetch(battlePDA);
  console.log('\n📊 Battle Data:');
  console.log(`  ID: ${battle.id.toString()}`);
  console.log(`  Creator: ${battle.creator.toBase58()}`);
  console.log(`  Entry Fee: ${battle.entryFee.toString()} lamports`);
  console.log(`  Status: ${Object.keys(battle.status)[0]}`);
  console.log(`  Player Pool: ${battle.playerPool.toString()} lamports`);

  // Check escrow balance
  const escrowBalance = await connection.getBalance(escrowPDA);
  console.log(`  Escrow Balance: ${escrowBalance / LAMPORTS_PER_SOL} SOL`);

  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Settle Battle (Solo Practice)\n');

  // For solo practice, we settle immediately with creator as winner
  console.log('Settling battle with Creator as winner...');

  try {
    const tx = await (program.methods as any)
      .settleBattle({ creator: {} })
      .accounts({
        config: configPDA,
        battle: battlePDA,
        caller: wallet.publicKey,
      })
      .signers([wallet])
      .rpc();
    console.log(`✓ Battle settled! Tx: ${tx}`);
  } catch (err: any) {
    console.error('❌ Settle failed:', err.message);
    if (err.logs) {
      console.log('Logs:', err.logs.join('\n'));
    }
    // Don't exit - try to continue for debugging
  }

  // Refetch battle
  await new Promise(r => setTimeout(r, 2000));
  const settledBattle = await (program.account as any).battle.fetch(battlePDA);
  console.log(`  Status after settle: ${Object.keys(settledBattle.status)[0]}`);
  console.log(`  Winner: ${settledBattle.winner.toBase58()}`);

  console.log('\n' + '='.repeat(50));
  console.log('STEP 4: Claim Prize\n');

  const balanceBefore = await connection.getBalance(wallet.publicKey);
  console.log(`Balance before claim: ${balanceBefore / LAMPORTS_PER_SOL} SOL`);

  try {
    const tx = await (program.methods as any)
      .claimPlayerPrize()
      .accounts({
        battle: battlePDA,
        escrow: escrowPDA,
        player: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log(`✓ Prize claimed! Tx: ${tx}`);
  } catch (err: any) {
    console.error('❌ Claim failed:', err.message);
    if (err.logs) {
      console.log('Logs:', err.logs.join('\n'));
    }
  }

  await new Promise(r => setTimeout(r, 2000));
  const balanceAfter = await connection.getBalance(wallet.publicKey);
  console.log(`Balance after claim: ${balanceAfter / LAMPORTS_PER_SOL} SOL`);
  console.log(`Received: ${(balanceAfter - balanceBefore) / LAMPORTS_PER_SOL} SOL`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ TEST COMPLETE\n');

  // Final config state
  const finalConfig = await (program.account as any).config.fetch(configPDA);
  console.log('Final Config State:');
  console.log(`  Total Battles: ${finalConfig.totalBattles.toString()}`);
  console.log(`  Total Volume: ${finalConfig.totalVolume.toString()} lamports`);
  console.log(`  Total Fees: ${finalConfig.totalFeesCollected.toString()} lamports`);
}

main().catch(console.error);
