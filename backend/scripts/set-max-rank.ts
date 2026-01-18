/**
 * Script to set a wallet to max rank (Level 100)
 *
 * Usage:
 *   DATABASE_URL="your-postgres-url" npx ts-node scripts/set-max-rank.ts <wallet_address>
 *
 * Or set DATABASE_URL in .env file and run:
 *   npx ts-node scripts/set-max-rank.ts <wallet_address>
 */

import { Pool } from 'pg';

const WALLET = process.argv[2] || 'GxjjUmgTR9uR63b1xgmnv5RweZgLu3FKrLspY9pCZdEN';
const MAX_LEVEL = 100;
const XP_FOR_LEVEL_100 = 5475000; // From LEVEL_THRESHOLDS array

async function setMaxRank() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.log('\nUsage:');
    console.log('  DATABASE_URL="postgres://..." npx ts-node scripts/set-max-rank.ts [wallet_address]');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const now = Date.now();

  try {
    console.log(`Setting wallet ${WALLET} to Level ${MAX_LEVEL} (Mythic)...`);

    // Check if user exists
    const existing = await pool.query(
      'SELECT * FROM user_progression WHERE wallet_address = $1',
      [WALLET]
    );

    if (existing.rows.length === 0) {
      // Create new entry
      await pool.query(
        `INSERT INTO user_progression (wallet_address, total_xp, current_level, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [WALLET, XP_FOR_LEVEL_100, MAX_LEVEL, now, now]
      );
      console.log('Created new progression entry.');
    } else {
      // Update existing
      const oldLevel = existing.rows[0].current_level;
      const oldXp = existing.rows[0].total_xp;

      await pool.query(
        `UPDATE user_progression
         SET total_xp = $1, current_level = $2, updated_at = $3
         WHERE wallet_address = $4`,
        [XP_FOR_LEVEL_100, MAX_LEVEL, now, WALLET]
      );
      console.log(`Updated from Level ${oldLevel} (${oldXp.toLocaleString()} XP) to Level ${MAX_LEVEL} (${XP_FOR_LEVEL_100.toLocaleString()} XP)`);
    }

    // Grant Level 100 rewards: immortan border + permanent perks + 10 free bets
    console.log('\nGranting Level 100 rewards...');

    // Grant immortan border cosmetic
    await pool.query(
      `INSERT INTO user_cosmetics (wallet_address, cosmetic_type, cosmetic_id, unlock_level, created_at)
       VALUES ($1, 'border', 'immortan', 100, $2)
       ON CONFLICT (wallet_address, cosmetic_type, cosmetic_id) DO NOTHING`,
      [WALLET, now]
    );
    console.log('- Mythic border cosmetic granted');

    // Grant permanent rake_7 perk
    await pool.query(
      `INSERT INTO user_perks (wallet_address, perk_type, unlock_level, is_used, created_at)
       VALUES ($1, 'rake_7', 100, 0, $2)`,
      [WALLET, now]
    );
    console.log('- Permanent 7% rake perk granted');

    // Grant permanent oracle_3_5 perk
    await pool.query(
      `INSERT INTO user_perks (wallet_address, perk_type, unlock_level, is_used, created_at)
       VALUES ($1, 'oracle_3_5', 100, 0, $2)`,
      [WALLET, now]
    );
    console.log('- Permanent 3.5% oracle rake perk granted');

    // Grant 10 free bets
    const freeBetResult = await pool.query(
      `INSERT INTO free_bet_credits (wallet_address, balance, lifetime_earned, lifetime_used, updated_at)
       VALUES ($1, 10, 10, 0, $2)
       ON CONFLICT (wallet_address)
       DO UPDATE SET balance = free_bet_credits.balance + 10, lifetime_earned = free_bet_credits.lifetime_earned + 10, updated_at = $2
       RETURNING balance`,
      [WALLET, now]
    );
    console.log(`- 10 free bets granted (total balance: ${freeBetResult.rows[0]?.balance || 10})`);

    console.log('\n✓ Successfully set to Level 100 (Mythic) with all rewards!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setMaxRank();
