use anchor_lang::prelude::*;
use anchor_lang::system_program;
use bytemuck::{Pod, Zeroable};

declare_id!("9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF");

// =============================================================================
// PYTH ORACLE DATA STRUCTURES (Manual parsing to avoid dependency issues)
// =============================================================================

/// Pyth price account magic number
const PYTH_MAGIC: u32 = 0xa1b2c3d4;

/// Pyth price status
#[repr(u32)]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PythPriceStatus {
    Unknown = 0,
    Trading = 1,
    Halted = 2,
    Auction = 3,
}

/// Pyth price info (aggregate data)
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct PythPriceInfo {
    pub price: i64,
    pub conf: u64,
    pub status: u32,
    pub corp_act: u32,
    pub pub_slot: u64,
}

/// Pyth price account data structure
/// Based on Pyth V2 price account layout
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct PythPriceAccount {
    pub magic: u32,
    pub ver: u32,
    pub atype: u32,
    pub size: u32,
    pub price_type: u32,
    pub expo: i32,
    pub num_components: u32,
    pub num_quoters: u32,
    pub last_slot: u64,
    pub valid_slot: u64,
    pub ema_price: i64,
    pub ema_conf: u64,
    pub timestamp: i64,
    pub min_publishers: u8,
    pub drv2: u8,
    pub drv3: u16,
    pub drv4: u32,
    pub product: [u8; 32],
    pub next: [u8; 32],
    pub prev_slot: u64,
    pub prev_price: i64,
    pub prev_conf: u64,
    pub prev_timestamp: i64,
    pub agg: PythPriceInfo,
}

// =============================================================================
// CONSTANTS
// =============================================================================

/// Platform fee in basis points (500 = 5%)
const PLATFORM_FEE_BPS: u64 = 500;

/// Minimum bet size in lamports (0.01 SOL)
const MIN_BET_LAMPORTS: u64 = 10_000_000;

/// Price movement threshold for a draw in basis points (10 = 0.1%)
/// If price moves less than this, round is a draw and everyone gets refunded
const DRAW_THRESHOLD_BPS: u64 = 10;

/// Total round duration in seconds
const ROUND_DURATION_SECS: i64 = 30;

/// Seconds before round end when betting closes
/// Betting window = ROUND_DURATION_SECS - BETTING_LOCK_BEFORE_END
const BETTING_LOCK_BEFORE_END: i64 = 5;

/// Maximum age for Pyth price data in seconds
const MAX_PRICE_AGE_SECS: u64 = 60;

/// Maximum early bird bonus in basis points (2000 = 20%)
/// Formula: multiplier = 1 + (EARLY_BIRD_MAX_BPS/10000 * (1 - timeIntoRound/bettingDuration))
const EARLY_BIRD_MAX_BPS: u64 = 2000;

/// Betting duration in seconds (ROUND_DURATION_SECS - BETTING_LOCK_BEFORE_END)
const BETTING_DURATION_SECS: i64 = ROUND_DURATION_SECS - BETTING_LOCK_BEFORE_END;

// =============================================================================
// PROGRAM
// =============================================================================

#[program]
pub mod prediction_program {
    use super::*;

    /// Initializes the game and starts the first round.
    ///
    /// This is a one-time setup called by the authority at launch.
    /// After this, the game runs continuously forever via the crank mechanism.
    ///
    /// # Accounts
    /// - `authority` - The deployer who becomes the fee withdrawal authority
    /// - `price_feed` - Pyth SOL/USD price feed account
    /// - `treasury` - Address for fee collection (can be multisig)
    ///
    /// # Flow
    /// 1. Creates the global GameState account
    /// 2. Creates Round 0 with current price from Pyth
    /// 3. Round 0 immediately opens for betting
    pub fn initialize_game(ctx: Context<InitializeGame>, treasury: Pubkey) -> Result<()> {
        require!(treasury != Pubkey::default(), ErrorCode::InvalidZeroAddress);
        let game = &mut ctx.accounts.game_state;
        let round = &mut ctx.accounts.round;
        let clock = Clock::get()?;

        // Fetch current SOL price from Pyth oracle
        let start_price = get_pyth_price(&ctx.accounts.price_feed, clock.unix_timestamp)?;

        // Initialize game state
        game.authority = ctx.accounts.authority.key();
        game.treasury = treasury;
        game.price_feed = ctx.accounts.price_feed.key();
        game.current_round = 1; // Next round to be created will be Round 1
        game.total_volume = 0;
        game.total_fees_collected = 0;
        game.paused = false;
        game.bump = ctx.bumps.game_state;

        // Initialize Round 0
        round.round_id = 0;
        round.start_time = clock.unix_timestamp;
        round.lock_time = clock.unix_timestamp + ROUND_DURATION_SECS - BETTING_LOCK_BEFORE_END;
        round.end_time = clock.unix_timestamp + ROUND_DURATION_SECS;
        round.start_price = start_price;
        round.end_price = 0;
        round.up_pool = 0;
        round.down_pool = 0;
        round.total_pool = 0;
        round.status = RoundStatus::Betting;
        round.winner = WinnerSide::None;
        round.fees_withdrawn = false;
        round.bump = ctx.bumps.round;

        msg!("Game initialized. Round 0 started at price: {}. Treasury: {}", start_price, treasury);
        Ok(())
    }

    /// Places a bet on UP or DOWN for the current open round.
    ///
    /// # Arguments
    /// - `side` - BetSide::Up or BetSide::Down
    /// - `amount` - Amount to bet in lamports (min 0.01 SOL)
    ///
    /// # Requirements
    /// - Game must not be paused
    /// - Round must be open (status = Open)
    /// - Current time must be before lock_time (betting window)
    /// - Amount must be >= MIN_BET_LAMPORTS
    ///
    /// # Flow
    /// 1. Transfers SOL from player to round escrow PDA
    /// 2. Updates round pool totals
    /// 3. Creates PlayerPosition account tracking the bet
    pub fn place_bet(ctx: Context<PlaceBet>, side: BetSide, amount: u64) -> Result<()> {
        let game = &ctx.accounts.game_state;
        let round = &mut ctx.accounts.round;
        let position = &mut ctx.accounts.position;
        let clock = Clock::get()?;

        // Validate game state
        require!(!game.paused, ErrorCode::GamePaused);
        require!(round.status == RoundStatus::Betting, ErrorCode::RoundNotBetting);
        require!(clock.unix_timestamp < round.lock_time, ErrorCode::BettingClosed);
        require!(amount >= MIN_BET_LAMPORTS, ErrorCode::BetTooSmall);

        // Transfer SOL to escrow (trustless - PDA holds funds)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update round pools with overflow protection
        match side {
            BetSide::Up => {
                round.up_pool = round.up_pool
                    .checked_add(amount)
                    .ok_or(ErrorCode::PoolOverflow)?;
            },
            BetSide::Down => {
                round.down_pool = round.down_pool
                    .checked_add(amount)
                    .ok_or(ErrorCode::PoolOverflow)?;
            },
        }
        round.total_pool = round.total_pool
            .checked_add(amount)
            .ok_or(ErrorCode::PoolOverflow)?;

        // Record player's position
        position.player = ctx.accounts.player.key();
        position.round_id = round.round_id;
        position.side = side;
        position.amount = amount;
        position.bet_timestamp = clock.unix_timestamp;
        position.claimed = false;
        position.bump = ctx.bumps.position;

        msg!("Bet placed: {} lamports on {:?}", amount, side);
        Ok(())
    }

    /// Advances the game by settling the current round and starting the next.
    ///
    /// This is the "crank" mechanism that keeps the game running continuously.
    /// Anyone can call this - the caller pays rent for the next round account.
    ///
    /// # Requirements
    /// - Game must not be paused
    /// - Current round must be open (not already settled)
    /// - Current time must be >= round end_time
    /// - Valid Pyth price feed must be provided
    ///
    /// # Flow
    /// 1. Fetches end price from Pyth oracle
    /// 2. Determines winner (Up/Down/Draw) based on price movement
    /// 3. Calculates and records platform fees (only if real winner)
    /// 4. Marks current round as Settled
    /// 5. Creates and opens the next round
    pub fn crank(ctx: Context<Crank>) -> Result<()> {
        let game = &mut ctx.accounts.game_state;
        let current_round = &mut ctx.accounts.current_round;
        let next_round = &mut ctx.accounts.next_round;
        let clock = Clock::get()?;

        // Validate state
        require!(!game.paused, ErrorCode::GamePaused);
        require!(current_round.status == RoundStatus::Betting, ErrorCode::RoundNotBetting);
        require!(clock.unix_timestamp >= current_round.end_time, ErrorCode::RoundNotEnded);

        // Fetch end price from Pyth oracle
        let end_price = get_pyth_price(&ctx.accounts.price_feed, clock.unix_timestamp)?;

        // === SETTLE CURRENT ROUND ===
        current_round.end_price = end_price;
        current_round.winner = determine_winner(
            current_round.start_price,
            current_round.end_price,
            current_round.up_pool,
            current_round.down_pool,
        );

        // Only collect fees if there's a real winner (both sides had bets)
        if current_round.winner != WinnerSide::Draw && current_round.total_pool > 0 {
            let fee = (current_round.total_pool * PLATFORM_FEE_BPS) / 10000;
            game.total_fees_collected += fee;
        }

        game.total_volume += current_round.total_pool;
        current_round.status = RoundStatus::Settled;

        // === START NEXT ROUND ===
        next_round.round_id = game.current_round;
        next_round.start_time = clock.unix_timestamp;
        next_round.lock_time = clock.unix_timestamp + ROUND_DURATION_SECS - BETTING_LOCK_BEFORE_END;
        next_round.end_time = clock.unix_timestamp + ROUND_DURATION_SECS;
        next_round.start_price = end_price; // New round starts at current price
        next_round.end_price = 0;
        next_round.up_pool = 0;
        next_round.down_pool = 0;
        next_round.total_pool = 0;
        next_round.status = RoundStatus::Betting;
        next_round.winner = WinnerSide::None;
        next_round.fees_withdrawn = false;
        next_round.bump = ctx.bumps.next_round;

        game.current_round += 1;

        msg!(
            "Round {} settled: {:?}. Round {} started at price: {}",
            current_round.round_id,
            current_round.winner,
            next_round.round_id,
            end_price
        );
        Ok(())
    }

    /// Claims winnings or refund from a settled round.
    ///
    /// # Requirements
    /// - Round must be settled
    /// - Position must not already be claimed
    /// - Caller must be the position owner
    ///
    /// # Payout Logic
    /// - Draw: Full refund of bet amount
    /// - Winner: Proportional share of prize pool (total pool minus 5% fee)
    /// - Loser: Nothing (transaction will fail with NotAWinner)
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let round = &ctx.accounts.round;
        let position = &mut ctx.accounts.position;

        // Validate claim
        require!(round.status == RoundStatus::Settled, ErrorCode::RoundNotSettled);
        require!(!position.claimed, ErrorCode::AlreadyClaimed);
        require!(position.player == ctx.accounts.player.key(), ErrorCode::NotPositionOwner);

        // Calculate payout
        let payout = calculate_payout(round, position)?;

        // Transfer from escrow PDA to player
        let round_id_bytes = round.round_id.to_le_bytes();
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[&[b"escrow", round_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
            ),
            payout,
        )?;

        position.claimed = true;

        msg!("Claimed {} lamports", payout);
        Ok(())
    }

    /// Pauses or unpauses the game. Authority only.
    ///
    /// When paused:
    /// - No new bets can be placed
    /// - Crank cannot be called
    /// - Claims still work (players can withdraw from settled rounds)
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        ctx.accounts.game_state.paused = paused;
        msg!("Game paused: {}", paused);
        Ok(())
    }

    /// Withdraws platform fees from a settled round's escrow to treasury. Authority only.
    ///
    /// Fees are left in each round's escrow after claims. The authority
    /// can withdraw the remaining balance (which represents the 5% fee).
    ///
    /// # Requirements
    /// - Round must be settled
    /// - Fees must not have been withdrawn already
    /// - Caller must be authority
    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let round = &mut ctx.accounts.round;

        require!(round.status == RoundStatus::Settled, ErrorCode::RoundNotSettled);
        require!(!round.fees_withdrawn, ErrorCode::FeesAlreadyWithdrawn);

        // The remaining balance in escrow is the platform fee
        let escrow_balance = ctx.accounts.escrow.lamports();

        if escrow_balance > 0 {
            let round_id_bytes = round.round_id.to_le_bytes();
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[&[b"escrow", round_id_bytes.as_ref(), &[ctx.bumps.escrow]]],
                ),
                escrow_balance,
            )?;

            msg!("Withdrew {} lamports in fees to treasury from round {}", escrow_balance, round.round_id);
        }

        round.fees_withdrawn = true;
        Ok(())
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/// Fetches the current SOL/USD price from a Pyth price feed account.
/// Uses manual bytemuck parsing to avoid pyth-sdk-solana dependency issues.
fn get_pyth_price(price_feed: &AccountInfo, current_timestamp: i64) -> Result<u64> {
    // Borrow account data
    let data = price_feed.try_borrow_data()
        .map_err(|_| ErrorCode::InvalidPriceFeed)?;

    // Ensure we have enough data
    require!(data.len() >= std::mem::size_of::<PythPriceAccount>(), ErrorCode::InvalidPriceFeed);

    // Parse using bytemuck
    let price_account: &PythPriceAccount = bytemuck::from_bytes(
        &data[..std::mem::size_of::<PythPriceAccount>()]
    );

    // Validate magic number
    require!(price_account.magic == PYTH_MAGIC, ErrorCode::InvalidPriceFeed);

    // Check price status (1 = Trading)
    require!(price_account.agg.status == 1, ErrorCode::StalePriceFeed);

    // Check price staleness
    let price_age = current_timestamp.saturating_sub(price_account.timestamp);
    require!(price_age >= 0 && price_age <= MAX_PRICE_AGE_SECS as i64, ErrorCode::StalePriceFeed);

    // Validate price is positive before casting
    require!(price_account.agg.price > 0, ErrorCode::InvalidPrice);

    // Safe cast: we've verified price > 0, so it fits in u64
    let price = u64::try_from(price_account.agg.price).map_err(|_| ErrorCode::InvalidPrice)?;

    Ok(price)
}

/// Determines the winner of a round based on price movement and pool state.
fn determine_winner(start_price: u64, end_price: u64, up_pool: u64, down_pool: u64) -> WinnerSide {
    // If only one side has bets, it's a draw (refund everyone)
    if up_pool == 0 || down_pool == 0 {
        return WinnerSide::Draw;
    }

    // Prevent division by zero
    if start_price == 0 {
        return WinnerSide::Draw;
    }

    // Calculate price movement in basis points using checked arithmetic
    let diff_bps = if end_price >= start_price {
        end_price
            .checked_sub(start_price)
            .and_then(|diff| diff.checked_mul(10000))
            .map(|scaled| scaled / start_price)
            .unwrap_or(0)
    } else {
        start_price
            .checked_sub(end_price)
            .and_then(|diff| diff.checked_mul(10000))
            .map(|scaled| scaled / start_price)
            .unwrap_or(0)
    };

    // If price didn't move enough, it's a draw
    if diff_bps <= DRAW_THRESHOLD_BPS {
        return WinnerSide::Draw;
    }

    // Determine winner based on price direction
    if end_price > start_price {
        WinnerSide::Up
    } else {
        WinnerSide::Down
    }
}

/// Calculates the early bird multiplier based on when the bet was placed.
/// Formula: multiplier = 1 + (EARLY_BIRD_MAX_BPS/10000 * (1 - timeIntoRound/bettingDuration))
/// Returns multiplier in basis points (10000 = 1x, 12000 = 1.2x)
fn calculate_early_bird_multiplier(round: &PredictionRound, position: &PlayerPosition) -> u64 {
    // Time into round when bet was placed
    let time_into_round = position.bet_timestamp.saturating_sub(round.start_time);

    // If bet was placed at or after lock time, no bonus
    if time_into_round >= BETTING_DURATION_SECS {
        return 10000; // 1x multiplier
    }

    // If bet_timestamp is 0 (legacy positions), no bonus
    if position.bet_timestamp == 0 {
        return 10000; // 1x multiplier
    }

    // Calculate bonus: (1 - timeIntoRound/bettingDuration) * EARLY_BIRD_MAX_BPS
    // Using u64 to avoid overflow
    let time_remaining = (BETTING_DURATION_SECS - time_into_round) as u64;
    let betting_duration = BETTING_DURATION_SECS as u64;

    // Bonus in basis points = EARLY_BIRD_MAX_BPS * time_remaining / betting_duration
    // Using u128 intermediate to prevent overflow and precision loss
    let bonus_bps = ((EARLY_BIRD_MAX_BPS as u128)
        .checked_mul(time_remaining as u128)
        .unwrap_or(0) / betting_duration as u128) as u64;

    // Total multiplier = 10000 (1x) + bonus
    10000_u64.saturating_add(bonus_bps)
}

/// Calculates the payout for a player's position.
fn calculate_payout(round: &PredictionRound, position: &PlayerPosition) -> Result<u64> {
    // Draw = full refund
    if round.winner == WinnerSide::Draw {
        return Ok(position.amount);
    }

    // Check if player won
    let player_won = matches!(
        (&round.winner, &position.side),
        (WinnerSide::Up, BetSide::Up) | (WinnerSide::Down, BetSide::Down)
    );
    require!(player_won, ErrorCode::NotAWinner);

    // Calculate proportional share of prize pool
    let winning_pool = match round.winner {
        WinnerSide::Up => round.up_pool,
        WinnerSide::Down => round.down_pool,
        _ => return Err(ErrorCode::InvalidWinner.into()),
    };

    // Prevent division by zero
    require!(winning_pool > 0, ErrorCode::InvalidWinner);

    // Use checked arithmetic for fee calculation
    let fee_multiplier = 10000_u64
        .checked_sub(PLATFORM_FEE_BPS)
        .ok_or(ErrorCode::InvalidWinner)?;

    let pool_after_fee = round.total_pool
        .checked_mul(fee_multiplier)
        .ok_or(ErrorCode::InvalidWinner)?
        / 10000;

    // Calculate base payout using u128 to prevent overflow
    let base_payout_u128 = (position.amount as u128)
        .checked_mul(pool_after_fee as u128)
        .ok_or(ErrorCode::InvalidWinner)?
        / (winning_pool as u128);

    // Apply early bird multiplier
    let early_bird_multiplier = calculate_early_bird_multiplier(round, position);
    let payout_with_bonus = base_payout_u128
        .checked_mul(early_bird_multiplier as u128)
        .ok_or(ErrorCode::InvalidWinner)?
        / 10000;

    // Safe conversion back to u64
    let payout = u64::try_from(payout_with_bonus).map_err(|_| ErrorCode::InvalidWinner)?;

    Ok(payout)
}

// =============================================================================
// ACCOUNT STRUCTURES
// =============================================================================

/// Global game state. One per deployment.
#[account]
#[derive(InitSpace)]
pub struct GameState {
    /// Authority who can pause game and withdraw fees
    pub authority: Pubkey,
    /// Treasury address for fee collection (can be multisig)
    pub treasury: Pubkey,
    /// Expected Pyth price feed (validated on every oracle read)
    pub price_feed: Pubkey,
    /// ID of the next round to be created
    pub current_round: u64,
    /// Total SOL volume traded through the game
    pub total_volume: u64,
    /// Total platform fees collected (available for withdrawal)
    pub total_fees_collected: u64,
    /// Emergency pause flag
    pub paused: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// A single prediction round.
#[account]
#[derive(InitSpace)]
pub struct PredictionRound {
    /// Unique round identifier (0, 1, 2, ...)
    pub round_id: u64,
    /// Unix timestamp when round started
    pub start_time: i64,
    /// Unix timestamp when betting closes (start + 20s)
    pub lock_time: i64,
    /// Unix timestamp when round ends (start + 30s)
    pub end_time: i64,
    /// SOL price at round start (from Pyth, typically 8 decimals)
    pub start_price: u64,
    /// SOL price at round end (from Pyth)
    pub end_price: u64,
    /// Total SOL bet on UP
    pub up_pool: u64,
    /// Total SOL bet on DOWN
    pub down_pool: u64,
    /// Total SOL in round (up_pool + down_pool)
    pub total_pool: u64,
    /// Current round status
    pub status: RoundStatus,
    /// Winner after settlement
    pub winner: WinnerSide,
    /// Whether fees have been withdrawn from this round
    pub fees_withdrawn: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// A player's bet position in a round.
#[account]
#[derive(InitSpace)]
pub struct PlayerPosition {
    /// Player's wallet address
    pub player: Pubkey,
    /// Round this position belongs to
    pub round_id: u64,
    /// Which side they bet on
    pub side: BetSide,
    /// Amount bet in lamports
    pub amount: u64,
    /// Timestamp when bet was placed (for early bird calculation)
    pub bet_timestamp: i64,
    /// Whether winnings have been claimed
    pub claimed: bool,
    /// PDA bump seed
    pub bump: u8,
}

// =============================================================================
// ENUMS
// =============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RoundStatus {
    /// Accepting bets (until lock_time)
    Betting,
    /// Betting closed, waiting for round to end
    Locked,
    /// Round complete, winner determined
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum WinnerSide {
    /// Round not yet settled
    None,
    /// Price went up - UP bettors win
    Up,
    /// Price went down - DOWN bettors win
    Down,
    /// No winner (refund) - price didn't move enough or one-sided betting
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum BetSide {
    /// Betting price will go up
    Up,
    /// Betting price will go down
    Down,
}

// =============================================================================
// CONTEXT STRUCTS (Account Validation)
// =============================================================================

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    /// Global game state (created once)
    #[account(
        init,
        payer = authority,
        space = 8 + GameState::INIT_SPACE,
        seeds = [b"game"],
        bump
    )]
    pub game_state: Account<'info, GameState>,

    /// First round (Round 0)
    #[account(
        init,
        payer = authority,
        space = 8 + PredictionRound::INIT_SPACE,
        seeds = [b"round", 0u64.to_le_bytes().as_ref()],
        bump
    )]
    pub round: Account<'info, PredictionRound>,

    /// Escrow PDA for Round 0 (holds bets)
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"escrow", 0u64.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// Pyth SOL/USD price feed - stored in GameState for future validation
    /// CHECK: Validated via pyth_sdk; address stored and enforced in Crank
    pub price_feed: AccountInfo<'info>,

    /// Deployer becomes the authority
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    /// Global game state (for pause check)
    #[account(seeds = [b"game"], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    /// The round being bet on
    #[account(
        mut,
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    /// Player's position (created for this bet)
    #[account(
        init,
        payer = player,
        space = 8 + PlayerPosition::INIT_SPACE,
        seeds = [b"position", round.round_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump
    )]
    pub position: Account<'info, PlayerPosition>,

    /// Escrow PDA for this round
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"escrow", round.round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// Player placing the bet
    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Crank<'info> {
    /// Global game state
    #[account(mut, seeds = [b"game"], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    /// Current round to settle
    #[account(
        mut,
        seeds = [b"round", current_round.round_id.to_le_bytes().as_ref()],
        bump = current_round.bump
    )]
    pub current_round: Account<'info, PredictionRound>,

    /// Next round to create
    #[account(
        init,
        payer = cranker,
        space = 8 + PredictionRound::INIT_SPACE,
        seeds = [b"round", game_state.current_round.to_le_bytes().as_ref()],
        bump
    )]
    pub next_round: Account<'info, PredictionRound>,

    /// Escrow PDA for next round
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"escrow", game_state.current_round.to_le_bytes().as_ref()],
        bump
    )]
    pub next_escrow: SystemAccount<'info>,

    /// Pyth SOL/USD price feed - validated against stored address
    /// CHECK: Validated by address constraint and pyth_sdk
    #[account(address = game_state.price_feed @ ErrorCode::InvalidPriceFeed)]
    pub price_feed: AccountInfo<'info>,

    /// Anyone can crank - pays rent for next round account
    #[account(mut)]
    pub cranker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    /// The settled round
    #[account(
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    /// Player's position in the round
    #[account(
        mut,
        seeds = [b"position", round.round_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, PlayerPosition>,

    /// Escrow PDA holding the funds
    /// CHECK: PDA validated by seeds
    #[account(
        mut,
        seeds = [b"escrow", round.round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// Player claiming their winnings
    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump,
        has_one = authority
    )]
    pub game_state: Account<'info, GameState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump,
        has_one = authority,
        has_one = treasury
    )]
    pub game_state: Account<'info, GameState>,

    /// The settled round to withdraw fees from
    #[account(
        mut,
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    /// Escrow PDA holding the remaining fees
    #[account(
        mut,
        seeds = [b"escrow", round.round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// CHECK: Treasury receives the fees (can be multisig)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// =============================================================================
// ERROR CODES
// =============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Round is not in betting phase")]
    RoundNotBetting,

    #[msg("Betting is closed for this round")]
    BettingClosed,

    #[msg("Bet amount below minimum (0.01 SOL)")]
    BetTooSmall,

    #[msg("Round has not ended yet")]
    RoundNotEnded,

    #[msg("Round is not settled yet")]
    RoundNotSettled,

    #[msg("Winnings already claimed")]
    AlreadyClaimed,

    #[msg("Not the position owner")]
    NotPositionOwner,

    #[msg("You did not win this round")]
    NotAWinner,

    #[msg("Invalid winner state")]
    InvalidWinner,

    #[msg("Insufficient fees to withdraw")]
    InsufficientFees,

    #[msg("Invalid price from oracle")]
    InvalidPrice,

    #[msg("Invalid Pyth price feed account")]
    InvalidPriceFeed,

    #[msg("Price feed data is stale")]
    StalePriceFeed,

    #[msg("Game is paused")]
    GamePaused,

    #[msg("Pool overflow - maximum pool size exceeded")]
    PoolOverflow,

    #[msg("Fees have already been withdrawn for this round")]
    FeesAlreadyWithdrawn,

    #[msg("Cannot set address to zero/default pubkey")]
    InvalidZeroAddress,
}
