use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9");

// ============================================
// CONSTANTS
// ============================================

/// Platform rake on player prize pool (10%)
const PLAYER_RAKE_BPS: u64 = 1000;

/// Platform rake on spectator winnings (5%)
const SPECTATOR_RAKE_BPS: u64 = 500;

/// Minimum entry fee for battles (0.1 SOL)
const MIN_ENTRY_LAMPORTS: u64 = 100_000_000;

/// Minimum spectator bet (0.01 SOL)
const MIN_SPECTATOR_BET: u64 = 10_000_000;

/// Battle duration in seconds (30 minutes)
const BATTLE_DURATION_SECS: i64 = 1800;

/// Lock spectator betting this many seconds before battle ends
const BETTING_LOCK_BEFORE_END: i64 = 30;

/// Dispute window duration in seconds (1 hour)
const DISPUTE_WINDOW_SECS: i64 = 3600;

/// Stake required to file a dispute (0.1 SOL)
const DISPUTE_STAKE_LAMPORTS: u64 = 100_000_000;

/// Time after settlement before unclaimed prizes can be swept (30 days)
const CLAIM_TIMEOUT_SECS: i64 = 30 * 24 * 60 * 60;

/// Minimum total pool required for normal settlement (0.001 SOL)
/// Pools below this threshold are treated as draws to avoid rounding errors in fee calculations
const MIN_POOL_FOR_SETTLEMENT: u64 = 1_000_000;

// ============================================
// HELPER FUNCTIONS
// ============================================

/// Safe fee calculation using checked arithmetic
fn calculate_fee(amount: u64, fee_bps: u64) -> Option<u64> {
    amount.checked_mul(fee_bps).map(|v| v / 10000)
}

/// Safe payout calculation after fee
fn calculate_amount_after_fee(amount: u64, fee_bps: u64) -> Option<u64> {
    let fee_multiplier = 10000_u64.checked_sub(fee_bps)?;
    amount.checked_mul(fee_multiplier).map(|v| v / 10000)
}

/// Safe proportional payout calculation
fn calculate_proportional_payout(bet_amount: u64, total_pool: u64, winning_pool: u64) -> Option<u64> {
    if winning_pool == 0 {
        return None;
    }
    let payout_u128 = (bet_amount as u128)
        .checked_mul(total_pool as u128)?
        / (winning_pool as u128);
    u64::try_from(payout_u128).ok()
}

// ============================================
// PROGRAM
// ============================================

#[program]
pub mod battle_program {
    use super::*;

    // ----------------------------------------
    // Admin Instructions
    // ----------------------------------------

    /// Initialize the global config. Called once by the authority.
    /// Treasury can be set to a multisig address for decentralized fee collection.
    pub fn initialize(ctx: Context<Initialize>, treasury: Pubkey) -> Result<()> {
        require!(treasury != Pubkey::default(), ErrorCode::InvalidZeroAddress);
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.pending_authority = Pubkey::default();
        config.total_battles = 0;
        config.total_volume = 0;
        config.total_fees_collected = 0;
        config.bump = ctx.bumps.config;
        msg!("Config initialized. Authority: {}, Treasury: {}", config.authority, config.treasury);
        Ok(())
    }

    /// Update the treasury address (authority only).
    pub fn update_treasury(ctx: Context<UpdateConfig>, new_treasury: Pubkey) -> Result<()> {
        require!(new_treasury != Pubkey::default(), ErrorCode::InvalidZeroAddress);
        let config = &mut ctx.accounts.config;
        let old_treasury = config.treasury;
        config.treasury = new_treasury;
        msg!("Treasury updated: {} -> {}", old_treasury, new_treasury);
        Ok(())
    }

    /// Step 1 of authority transfer: Propose new authority.
    pub fn propose_authority(ctx: Context<UpdateConfig>, new_authority: Pubkey) -> Result<()> {
        require!(new_authority != Pubkey::default(), ErrorCode::InvalidZeroAddress);
        let config = &mut ctx.accounts.config;
        config.pending_authority = new_authority;
        msg!("Authority transfer proposed: {} -> {}", config.authority, new_authority);
        Ok(())
    }

    /// Step 2 of authority transfer: New authority accepts the transfer.
    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(
            config.pending_authority == ctx.accounts.new_authority.key(),
            ErrorCode::InvalidAuthority
        );
        let old_authority = config.authority;
        config.authority = config.pending_authority;
        config.pending_authority = Pubkey::default();
        msg!("Authority transferred: {} -> {}", old_authority, config.authority);
        Ok(())
    }

    /// Submit preliminary settlement (authority only).
    ///
    /// This starts the dispute window. The battle enters PendingDispute status
    /// and players have DISPUTE_WINDOW_SECS to challenge the result.
    ///
    /// If the total pool is below MIN_POOL_FOR_SETTLEMENT, the battle is treated
    /// as a draw to avoid rounding errors in fee calculations.
    pub fn settle_battle(ctx: Context<SettleBattle>, winner: PlayerSide) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::Active, ErrorCode::BattleNotActive);
        require!(clock.unix_timestamp >= battle.ends_at, ErrorCode::BattleNotEnded);

        // Calculate total pool including spectator bets
        let total_pool = battle.player_pool
            .checked_add(battle.spectator_pool_creator)
            .and_then(|v| v.checked_add(battle.spectator_pool_opponent))
            .unwrap_or(0);

        // Check if pool is too small for proper fee calculation
        if total_pool < MIN_POOL_FOR_SETTLEMENT {
            // Treat as draw - set proposed_winner to default (will trigger refund logic)
            battle.proposed_winner = Pubkey::default();
            battle.status = BattleStatus::PendingDispute;
            battle.dispute_deadline = clock.unix_timestamp + DISPUTE_WINDOW_SECS;
            msg!("Battle {} pool too small ({} < {}). Treating as draw.",
                 battle.id, total_pool, MIN_POOL_FOR_SETTLEMENT);
            return Ok(());
        }

        battle.proposed_winner = match winner {
            PlayerSide::Creator => battle.creator,
            PlayerSide::Opponent => battle.opponent,
        };
        battle.status = BattleStatus::PendingDispute;
        battle.dispute_deadline = clock.unix_timestamp + DISPUTE_WINDOW_SECS;

        msg!("Battle {} settled (pending dispute). Proposed winner: {:?}", battle.id, winner);
        msg!("Dispute window ends at: {}", battle.dispute_deadline);
        Ok(())
    }

    /// Resolve a dispute (authority only).
    ///
    /// If upheld (original settlement was correct): disputer loses stake to treasury
    /// If overturned: disputer gets stake back, settlement is reversed
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, upheld: bool) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let dispute = &mut ctx.accounts.dispute;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::Disputed, ErrorCode::NotDisputed);
        require!(!dispute.resolved, ErrorCode::DisputeAlreadyResolved);

        dispute.resolved = true;
        dispute.upheld = upheld;

        if upheld {
            // Original settlement was correct - disputer loses stake to treasury
            let battle_id_bytes = battle.id.to_le_bytes();
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.dispute_escrow.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[&[b"dispute_escrow", battle_id_bytes.as_ref(), &[ctx.bumps.dispute_escrow]]],
                ),
                DISPUTE_STAKE_LAMPORTS,
            )?;
            config.total_fees_collected += DISPUTE_STAKE_LAMPORTS;
            msg!("Dispute rejected. Original settlement upheld. Stake forfeited to treasury.");
        } else {
            // Settlement overturned - swap the winner
            if battle.proposed_winner == battle.creator {
                battle.proposed_winner = battle.opponent;
            } else {
                battle.proposed_winner = battle.creator;
            }

            // Refund dispute stake
            let battle_id_bytes = battle.id.to_le_bytes();
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.dispute_escrow.to_account_info(),
                        to: ctx.accounts.disputer.to_account_info(),
                    },
                    &[&[b"dispute_escrow", battle_id_bytes.as_ref(), &[ctx.bumps.dispute_escrow]]],
                ),
                DISPUTE_STAKE_LAMPORTS,
            )?;
            msg!("Dispute accepted. Settlement overturned.");
        }

        // Finalize the battle
        battle.winner = battle.proposed_winner;
        battle.status = BattleStatus::Settled;
        battle.settled_at = clock.unix_timestamp;

        // Calculate fees using safe arithmetic
        let player_fee = calculate_fee(battle.player_pool, PLAYER_RAKE_BPS).unwrap_or(0);
        let total_spectator_pool = battle.spectator_pool_creator
            .checked_add(battle.spectator_pool_opponent)
            .unwrap_or(0);
        let spectator_fee = calculate_fee(total_spectator_pool, SPECTATOR_RAKE_BPS).unwrap_or(0);
        config.total_fees_collected = config.total_fees_collected
            .checked_add(player_fee)
            .and_then(|v| v.checked_add(spectator_fee))
            .unwrap_or(config.total_fees_collected);
        config.total_volume = config.total_volume
            .checked_add(battle.player_pool)
            .and_then(|v| v.checked_add(total_spectator_pool))
            .unwrap_or(config.total_volume);

        Ok(())
    }

    /// Withdraw collected fees from a battle's escrow to treasury (authority only).
    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;

        require!(battle.status == BattleStatus::Settled, ErrorCode::BattleNotSettled);
        require!(battle.prize_claimed, ErrorCode::PrizeNotYetClaimed);
        require!(!battle.fees_withdrawn, ErrorCode::FeesAlreadyWithdrawn);

        let player_fee = calculate_fee(battle.player_pool, PLAYER_RAKE_BPS).unwrap_or(0);
        let total_spectator_pool = battle.spectator_pool_creator
            .checked_add(battle.spectator_pool_opponent)
            .unwrap_or(0);
        let spectator_fee = calculate_fee(total_spectator_pool, SPECTATOR_RAKE_BPS).unwrap_or(0);
        let total_fee = player_fee.checked_add(spectator_fee).unwrap_or(0);

        let escrow_balance = ctx.accounts.escrow.lamports();
        let withdrawable = std::cmp::min(total_fee, escrow_balance);

        if withdrawable > 0 {
            let battle_id_bytes = battle.id.to_le_bytes();
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
                ),
                withdrawable,
            )?;
        }

        battle.fees_withdrawn = true;
        msg!("Withdrawn {} lamports in fees to treasury from battle {}", withdrawable, battle.id);
        Ok(())
    }

    /// Sweep unclaimed prizes and fees after timeout (authority only).
    /// Can only be called after CLAIM_TIMEOUT_SECS (30 days) since settlement.
    pub fn sweep_unclaimed(ctx: Context<SweepUnclaimed>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::Settled, ErrorCode::BattleNotSettled);
        require!(!battle.prize_claimed, ErrorCode::PrizeAlreadyClaimed);
        require!(
            clock.unix_timestamp >= battle.settled_at + CLAIM_TIMEOUT_SECS,
            ErrorCode::ClaimTimeoutNotReached
        );

        let escrow_balance = ctx.accounts.escrow.lamports();

        if escrow_balance > 0 {
            let battle_id_bytes = battle.id.to_le_bytes();
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
                ),
                escrow_balance,
            )?;
        }

        battle.prize_claimed = true;
        battle.fees_withdrawn = true;

        msg!(
            "Swept {} lamports from battle {} to treasury (unclaimed after {} days)",
            escrow_balance,
            battle.id,
            CLAIM_TIMEOUT_SECS / 86400
        );
        Ok(())
    }

    // ----------------------------------------
    // Player Instructions
    // ----------------------------------------

    /// Create a new battle lobby and wait for an opponent.
    pub fn create_battle(ctx: Context<CreateBattle>, entry_fee: u64) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let battle = &mut ctx.accounts.battle;

        require!(entry_fee >= MIN_ENTRY_LAMPORTS, ErrorCode::EntryFeeTooLow);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            entry_fee,
        )?;

        battle.id = config.total_battles;
        battle.creator = ctx.accounts.creator.key();
        battle.opponent = Pubkey::default();
        battle.entry_fee = entry_fee;
        battle.status = BattleStatus::Waiting;
        battle.winner = Pubkey::default();
        battle.proposed_winner = Pubkey::default();
        battle.player_pool = entry_fee;
        battle.spectator_pool_creator = 0;
        battle.spectator_pool_opponent = 0;
        battle.betting_locked = false;
        battle.prize_claimed = false;
        battle.fees_withdrawn = false;
        battle.created_at = Clock::get()?.unix_timestamp;
        battle.started_at = 0;
        battle.ends_at = 0;
        battle.dispute_deadline = 0;
        battle.settled_at = 0;
        battle.bump = ctx.bumps.battle;

        config.total_battles += 1;

        msg!("Battle {} created with entry fee {} lamports", battle.id, entry_fee);
        Ok(())
    }

    /// Join an existing battle lobby.
    pub fn join_battle(ctx: Context<JoinBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::Waiting, ErrorCode::BattleNotWaiting);
        require!(battle.creator != ctx.accounts.opponent.key(), ErrorCode::CannotJoinOwnBattle);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.opponent.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            battle.entry_fee,
        )?;

        battle.opponent = ctx.accounts.opponent.key();
        battle.player_pool = battle.player_pool
            .checked_add(battle.entry_fee)
            .ok_or(ErrorCode::PoolOverflow)?;
        battle.status = BattleStatus::Active;
        battle.started_at = clock.unix_timestamp;
        battle.ends_at = clock.unix_timestamp + BATTLE_DURATION_SECS;

        msg!("Battle {} started. Ends at {}", battle.id, battle.ends_at);
        Ok(())
    }

    /// Cancel a battle that hasn't started yet (creator only).
    pub fn cancel_battle(ctx: Context<CancelBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;

        require!(battle.status == BattleStatus::Waiting, ErrorCode::CannotCancel);
        require!(battle.creator == ctx.accounts.creator.key(), ErrorCode::NotCreator);

        let battle_id_bytes = battle.id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
                &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            battle.entry_fee,
        )?;

        battle.status = BattleStatus::Cancelled;
        msg!("Battle {} cancelled", battle.id);
        Ok(())
    }

    /// Winner claims the player prize pool.
    pub fn claim_player_prize(ctx: Context<ClaimPlayerPrize>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;

        require!(battle.status == BattleStatus::Settled, ErrorCode::BattleNotSettled);
        require!(ctx.accounts.player.key() == battle.winner, ErrorCode::NotWinner);
        require!(!battle.prize_claimed, ErrorCode::AlreadyClaimed);

        let payout = calculate_amount_after_fee(battle.player_pool, PLAYER_RAKE_BPS)
            .ok_or(ErrorCode::InvalidPayout)?;

        let battle_id_bytes = battle.id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            payout,
        )?;

        battle.prize_claimed = true;
        msg!("Player prize claimed: {} lamports", payout);
        Ok(())
    }

    /// Claim player refund when battle ended in a draw (small pool).
    ///
    /// When a battle's total pool is below MIN_POOL_FOR_SETTLEMENT, it's treated
    /// as a draw and both players can claim their entry fees back without any rake.
    pub fn claim_player_draw_refund(ctx: Context<ClaimPlayerDrawRefund>) -> Result<()> {
        let battle = &ctx.accounts.battle;
        let refund_record = &mut ctx.accounts.player_draw_refund;

        require!(battle.status == BattleStatus::Settled, ErrorCode::BattleNotSettled);
        // Draw is indicated by winner being the default pubkey
        require!(battle.winner == Pubkey::default(), ErrorCode::NotADraw);
        require!(!refund_record.claimed, ErrorCode::AlreadyClaimed);

        // Verify the player was actually in this battle
        let player_key = ctx.accounts.player.key();
        require!(
            player_key == battle.creator || player_key == battle.opponent,
            ErrorCode::NotAPlayer
        );

        // Refund the entry fee (no rake for draws)
        let refund_amount = battle.entry_fee;

        let battle_id_bytes = battle.id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            refund_amount,
        )?;

        refund_record.claimed = true;
        msg!("Player draw refund claimed: {} lamports", refund_amount);
        Ok(())
    }

    // ----------------------------------------
    // Dispute Instructions (Permissionless)
    // ----------------------------------------

    /// File a dispute against the proposed settlement.
    ///
    /// Anyone who participated (player or spectator) can dispute by staking SOL.
    /// Must be called within the dispute window.
    pub fn file_dispute(ctx: Context<FileDispute>, evidence_hash: [u8; 32]) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::PendingDispute, ErrorCode::NotPendingDispute);
        require!(clock.unix_timestamp < battle.dispute_deadline, ErrorCode::DisputeWindowClosed);

        // Transfer dispute stake to escrow
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.disputer.to_account_info(),
                    to: ctx.accounts.dispute_escrow.to_account_info(),
                },
            ),
            DISPUTE_STAKE_LAMPORTS,
        )?;

        // Record dispute
        dispute.battle_id = battle.id;
        dispute.disputer = ctx.accounts.disputer.key();
        dispute.evidence_hash = evidence_hash;
        dispute.filed_at = clock.unix_timestamp;
        dispute.resolved = false;
        dispute.upheld = false;
        dispute.bump = ctx.bumps.dispute;

        battle.status = BattleStatus::Disputed;

        msg!("Dispute filed for battle {} by {}", battle.id, ctx.accounts.disputer.key());
        Ok(())
    }

    /// Finalize settlement after dispute window passes with no disputes.
    ///
    /// Anyone can call this after the dispute window closes.
    /// This is a permissionless crank that confirms the proposed settlement.
    ///
    /// If proposed_winner is default (draw due to small pool), no fees are collected
    /// and participants can claim refunds.
    pub fn finalize_settlement(ctx: Context<FinalizeSettlement>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::PendingDispute, ErrorCode::NotPendingDispute);
        require!(clock.unix_timestamp >= battle.dispute_deadline, ErrorCode::DisputeWindowOpen);

        // No dispute filed - finalize with proposed winner
        battle.winner = battle.proposed_winner;
        battle.status = BattleStatus::Settled;
        battle.settled_at = clock.unix_timestamp;

        // Check if this is a draw (small pool) - no fees collected in draw
        let is_draw = battle.winner == Pubkey::default();

        if !is_draw {
            // Calculate fees using safe arithmetic (only for non-draw settlements)
            let player_fee = calculate_fee(battle.player_pool, PLAYER_RAKE_BPS).unwrap_or(0);
            let total_spectator_pool = battle.spectator_pool_creator
                .checked_add(battle.spectator_pool_opponent)
                .unwrap_or(0);
            let spectator_fee = calculate_fee(total_spectator_pool, SPECTATOR_RAKE_BPS).unwrap_or(0);
            config.total_fees_collected = config.total_fees_collected
                .checked_add(player_fee)
                .and_then(|v| v.checked_add(spectator_fee))
                .unwrap_or(config.total_fees_collected);
            config.total_volume = config.total_volume
                .checked_add(battle.player_pool)
                .and_then(|v| v.checked_add(total_spectator_pool))
                .unwrap_or(config.total_volume);
            msg!("Battle {} finalized. Winner: {}", battle.id, battle.winner);
        } else {
            // Draw - no fees, participants can claim refunds
            msg!("Battle {} finalized as draw (small pool). No fees collected.", battle.id);
        }

        Ok(())
    }

    // ----------------------------------------
    // Spectator Instructions
    // ----------------------------------------

    /// Place a spectator bet on which player will win.
    pub fn place_spectator_bet(
        ctx: Context<PlaceSpectatorBet>,
        backed_player: PlayerSide,
        amount: u64,
    ) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let bet = &mut ctx.accounts.spectator_bet;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::Active, ErrorCode::BattleNotActive);
        require!(!battle.betting_locked, ErrorCode::BettingLocked);
        require!(
            clock.unix_timestamp < battle.ends_at - BETTING_LOCK_BEFORE_END,
            ErrorCode::BettingLocked
        );
        require!(amount >= MIN_SPECTATOR_BET, ErrorCode::BetTooSmall);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.bettor.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        match backed_player {
            PlayerSide::Creator => {
                battle.spectator_pool_creator = battle.spectator_pool_creator
                    .checked_add(amount)
                    .ok_or(ErrorCode::PoolOverflow)?;
            },
            PlayerSide::Opponent => {
                battle.spectator_pool_opponent = battle.spectator_pool_opponent
                    .checked_add(amount)
                    .ok_or(ErrorCode::PoolOverflow)?;
            },
        }

        bet.bettor = ctx.accounts.bettor.key();
        bet.battle_id = battle.id;
        bet.backed_player = backed_player;
        bet.amount = amount;
        bet.claimed = false;
        bet.bump = ctx.bumps.spectator_bet;

        msg!("Spectator bet placed: {} lamports on {:?}", amount, backed_player);
        Ok(())
    }

    /// Lock spectator betting (permissionless crank).
    pub fn lock_betting(ctx: Context<LockBetting>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let clock = Clock::get()?;

        require!(battle.status == BattleStatus::Active, ErrorCode::BattleNotActive);
        require!(
            clock.unix_timestamp >= battle.ends_at - BETTING_LOCK_BEFORE_END,
            ErrorCode::TooEarlyToLock
        );

        battle.betting_locked = true;
        msg!("Betting locked for battle {}", battle.id);
        Ok(())
    }

    /// Claim spectator winnings.
    pub fn claim_spectator_winnings(ctx: Context<ClaimSpectatorWinnings>) -> Result<()> {
        let battle = &ctx.accounts.battle;
        let bet = &mut ctx.accounts.spectator_bet;

        require!(battle.status == BattleStatus::Settled, ErrorCode::BattleNotSettled);
        require!(!bet.claimed, ErrorCode::AlreadyClaimed);
        require!(bet.bettor == ctx.accounts.bettor.key(), ErrorCode::NotBetOwner);

        let bet_won = match bet.backed_player {
            PlayerSide::Creator => battle.winner == battle.creator,
            PlayerSide::Opponent => battle.winner == battle.opponent,
        };
        require!(bet_won, ErrorCode::BetLost);

        let (winning_pool, losing_pool) = match bet.backed_player {
            PlayerSide::Creator => (battle.spectator_pool_creator, battle.spectator_pool_opponent),
            PlayerSide::Opponent => (battle.spectator_pool_opponent, battle.spectator_pool_creator),
        };

        let payout = if losing_pool == 0 {
            bet.amount
        } else {
            let total_spectator_pool = battle.spectator_pool_creator
                .checked_add(battle.spectator_pool_opponent)
                .ok_or(ErrorCode::InvalidPayout)?;
            let pool_after_fee = calculate_amount_after_fee(total_spectator_pool, SPECTATOR_RAKE_BPS)
                .ok_or(ErrorCode::InvalidPayout)?;
            calculate_proportional_payout(bet.amount, pool_after_fee, winning_pool)
                .ok_or(ErrorCode::InvalidPayout)?
        };

        let battle_id_bytes = battle.id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.bettor.to_account_info(),
                },
                &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            payout,
        )?;

        bet.claimed = true;
        msg!("Spectator claimed: {} lamports", payout);
        Ok(())
    }

    /// Refund a spectator bet for a cancelled battle.
    ///
    /// When a battle is cancelled, spectators can reclaim their full bet amount.
    /// No fees are deducted since the battle never completed.
    pub fn refund_spectator_bet(ctx: Context<RefundSpectatorBet>) -> Result<()> {
        let battle = &ctx.accounts.battle;
        let bet = &mut ctx.accounts.spectator_bet;

        // Battle must be cancelled for refunds
        require!(battle.status == BattleStatus::Cancelled, ErrorCode::BattleNotCancelled);
        // Bet must not have been already refunded/claimed
        require!(!bet.claimed, ErrorCode::AlreadyClaimed);
        // Only the bettor can claim their refund
        require!(bet.bettor == ctx.accounts.bettor.key(), ErrorCode::NotBetOwner);

        // Refund the full bet amount (no fees for cancelled battles)
        let refund_amount = bet.amount;

        let battle_id_bytes = battle.id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.bettor.to_account_info(),
                },
                &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            refund_amount,
        )?;

        bet.claimed = true;
        msg!("Spectator bet refunded: {} lamports for cancelled battle {}", refund_amount, battle.id);
        Ok(())
    }

    /// Refund a spectator bet for a battle that ended in a draw (small pool).
    ///
    /// When a battle's total pool is below MIN_POOL_FOR_SETTLEMENT, it's treated
    /// as a draw. Spectators can reclaim their full bet amount without any rake.
    pub fn refund_spectator_draw_bet(ctx: Context<RefundSpectatorDrawBet>) -> Result<()> {
        let battle = &ctx.accounts.battle;
        let bet = &mut ctx.accounts.spectator_bet;

        // Battle must be settled with a draw (winner == default pubkey)
        require!(battle.status == BattleStatus::Settled, ErrorCode::BattleNotSettled);
        require!(battle.winner == Pubkey::default(), ErrorCode::NotADraw);
        // Bet must not have been already refunded/claimed
        require!(!bet.claimed, ErrorCode::AlreadyClaimed);
        // Only the bettor can claim their refund
        require!(bet.bettor == ctx.accounts.bettor.key(), ErrorCode::NotBetOwner);

        // Refund the full bet amount (no fees for draw battles)
        let refund_amount = bet.amount;

        let battle_id_bytes = battle.id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.bettor.to_account_info(),
                },
                &[&[b"escrow", battle_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            refund_amount,
        )?;

        bet.claimed = true;
        msg!("Spectator bet refunded: {} lamports for draw battle {}", refund_amount, battle.id);
        Ok(())
    }
}

// ============================================
// ACCOUNT STRUCTURES
// ============================================

/// Global configuration for the battle platform.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub treasury: Pubkey,           // Separate address for fee collection (can be multisig)
    pub pending_authority: Pubkey,  // For two-step authority transfer
    pub total_battles: u64,
    pub total_volume: u64,
    pub total_fees_collected: u64,
    pub bump: u8,
}

/// A 1v1 leveraged trading battle.
#[account]
#[derive(InitSpace)]
pub struct Battle {
    pub id: u64,
    pub creator: Pubkey,
    pub opponent: Pubkey,
    pub entry_fee: u64,
    pub status: BattleStatus,
    /// Final confirmed winner (set after settlement finalized)
    pub winner: Pubkey,
    /// Proposed winner during dispute window
    pub proposed_winner: Pubkey,
    pub player_pool: u64,
    pub spectator_pool_creator: u64,
    pub spectator_pool_opponent: u64,
    pub betting_locked: bool,
    pub prize_claimed: bool,
    pub fees_withdrawn: bool,   // Prevents double fee withdrawal
    pub created_at: i64,
    pub started_at: i64,
    pub ends_at: i64,
    /// Deadline for filing disputes
    pub dispute_deadline: i64,
    /// When battle was settled (for claim timeout)
    pub settled_at: i64,
    pub bump: u8,
}

/// A spectator's bet on a battle.
#[account]
#[derive(InitSpace)]
pub struct SpectatorBet {
    pub bettor: Pubkey,
    pub battle_id: u64,
    pub backed_player: PlayerSide,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

/// A dispute against a battle settlement.
#[account]
#[derive(InitSpace)]
pub struct Dispute {
    pub battle_id: u64,
    pub disputer: Pubkey,
    /// Hash of evidence (e.g., IPFS hash of trading records)
    pub evidence_hash: [u8; 32],
    pub filed_at: i64,
    pub resolved: bool,
    /// True if original settlement was correct
    pub upheld: bool,
    pub bump: u8,
}

/// Tracks whether a player has claimed their draw refund.
/// Used when battles end in a draw due to small pool size.
#[account]
#[derive(InitSpace)]
pub struct PlayerDrawRefund {
    pub battle_id: u64,
    pub player: Pubkey,
    pub claimed: bool,
    pub bump: u8,
}

// ============================================
// ENUMS
// ============================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum BattleStatus {
    Waiting,
    Active,
    /// Settlement proposed, waiting for dispute window
    PendingDispute,
    /// Dispute filed, awaiting resolution
    Disputed,
    /// Final - no more changes
    Settled,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PlayerSide {
    Creator,
    Opponent,
}

// ============================================
// CONTEXT STRUCTS
// ============================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBattle<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = creator,
        space = 8 + Battle::INIT_SPACE,
        seeds = [b"battle", config.total_battles.to_le_bytes().as_ref()],
        bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"escrow", config.total_battles.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinBattle<'info> {
    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub opponent: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBattle<'info> {
    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceSpectatorBet<'info> {
    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        init,
        payer = bettor,
        space = 8 + SpectatorBet::INIT_SPACE,
        seeds = [b"spectator_bet", battle.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub spectator_bet: Account<'info, SpectatorBet>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockBetting<'info> {
    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleBattle<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FileDispute<'info> {
    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        init,
        payer = disputer,
        space = 8 + Dispute::INIT_SPACE,
        seeds = [b"dispute", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"dispute_escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub dispute_escrow: SystemAccount<'info>,

    #[account(mut)]
    pub disputer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority,
        has_one = treasury
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"dispute", battle.id.to_le_bytes().as_ref()],
        bump = dispute.bump
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"dispute_escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub dispute_escrow: SystemAccount<'info>,

    /// CHECK: Disputer receiving refund if dispute accepted
    #[account(mut, address = dispute.disputer)]
    pub disputer: AccountInfo<'info>,

    /// CHECK: Treasury receives forfeited dispute stakes (can be multisig)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeSettlement<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    /// Anyone can call this (permissionless crank)
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimPlayerPrize<'info> {
    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimSpectatorWinnings<'info> {
    #[account(
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"spectator_bet", battle.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump = spectator_bet.bump
    )]
    pub spectator_bet: Account<'info, SpectatorBet>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundSpectatorBet<'info> {
    #[account(
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"spectator_bet", battle.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump = spectator_bet.bump
    )]
    pub spectator_bet: Account<'info, SpectatorBet>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Context for claiming player refund when battle ends in a draw
#[derive(Accounts)]
pub struct ClaimPlayerDrawRefund<'info> {
    #[account(
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        init,
        payer = player,
        space = 8 + PlayerDrawRefund::INIT_SPACE,
        seeds = [b"player_draw_refund", battle.id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_draw_refund: Account<'info, PlayerDrawRefund>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Context for refunding spectator bet when battle ends in a draw
#[derive(Accounts)]
pub struct RefundSpectatorDrawBet<'info> {
    #[account(
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"spectator_bet", battle.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump = spectator_bet.bump
    )]
    pub spectator_bet: Account<'info, SpectatorBet>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority,
        has_one = treasury
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// CHECK: Treasury receives the fees (can be multisig)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Context for sweeping unclaimed prizes after timeout
#[derive(Accounts)]
pub struct SweepUnclaimed<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority,
        has_one = treasury
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"battle", battle.id.to_le_bytes().as_ref()],
        bump = battle.bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(
        mut,
        seeds = [b"escrow", battle.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// CHECK: Treasury receives the unclaimed funds (can be multisig)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Context for update_treasury and propose_authority
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

// Context for accept_authority
#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub new_authority: Signer<'info>,
}

// ============================================
// ERROR CODES
// ============================================

#[error_code]
pub enum ErrorCode {
    #[msg("Entry fee is below minimum (0.1 SOL)")]
    EntryFeeTooLow,

    #[msg("Battle is not waiting for opponent")]
    BattleNotWaiting,

    #[msg("Cannot join your own battle")]
    CannotJoinOwnBattle,

    #[msg("Battle is not active")]
    BattleNotActive,

    #[msg("Betting is locked")]
    BettingLocked,

    #[msg("Bet amount is below minimum (0.01 SOL)")]
    BetTooSmall,

    #[msg("Too early to lock betting")]
    TooEarlyToLock,

    #[msg("Battle has not ended yet")]
    BattleNotEnded,

    #[msg("Battle is not settled")]
    BattleNotSettled,

    #[msg("You are not the winner")]
    NotWinner,

    #[msg("Already claimed")]
    AlreadyClaimed,

    #[msg("Not the bet owner")]
    NotBetOwner,

    #[msg("Your bet lost")]
    BetLost,

    #[msg("Cannot cancel - battle already started or settled")]
    CannotCancel,

    #[msg("Not the battle creator")]
    NotCreator,

    #[msg("Prize not yet claimed - wait for winner to claim first")]
    PrizeNotYetClaimed,

    #[msg("Battle is not pending dispute")]
    NotPendingDispute,

    #[msg("Dispute window has closed")]
    DisputeWindowClosed,

    #[msg("Dispute window is still open")]
    DisputeWindowOpen,

    #[msg("Battle is not in disputed state")]
    NotDisputed,

    #[msg("Dispute has already been resolved")]
    DisputeAlreadyResolved,

    #[msg("Invalid payout calculation")]
    InvalidPayout,

    #[msg("Fees have already been withdrawn for this battle")]
    FeesAlreadyWithdrawn,

    #[msg("Pool overflow - maximum pool size exceeded")]
    PoolOverflow,

    #[msg("Cannot set address to zero/default pubkey")]
    InvalidZeroAddress,

    #[msg("Invalid authority - signer does not match pending authority")]
    InvalidAuthority,

    #[msg("Prize has already been claimed")]
    PrizeAlreadyClaimed,

    #[msg("Claim timeout has not been reached yet (30 days after settlement)")]
    ClaimTimeoutNotReached,

    #[msg("Battle is not cancelled - refunds only available for cancelled battles")]
    BattleNotCancelled,

    #[msg("Battle did not end in a draw - refunds only available for draw battles")]
    NotADraw,

    #[msg("Not a player in this battle")]
    NotAPlayer,
}
