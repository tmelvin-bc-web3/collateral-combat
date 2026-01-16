use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use pyth_sdk_solana::load_price_feed_from_account_info;

declare_id!("4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA");

// ===================
// Constants
// ===================

/// Minimum bet amount: 0.01 SOL (10,000,000 lamports)
pub const MIN_BET: u64 = 10_000_000;

/// Maximum bet amount: 100 SOL (100,000,000,000 lamports)
pub const MAX_BET: u64 = 100_000_000_000;

/// Platform fee: 5% (500 basis points)
pub const PLATFORM_FEE_BPS: u64 = 500;

/// Basis points denominator
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Round duration: 30 seconds
pub const ROUND_DURATION_SECONDS: i64 = 30;

/// Lock buffer: 5 seconds before round end
pub const LOCK_BUFFER_SECONDS: i64 = 5;

/// Fallback lock delay: 60 seconds after lock_time, anyone can lock the round
pub const FALLBACK_LOCK_DELAY_SECONDS: i64 = 60;

/// Maximum session validity: 7 days
pub const MAX_SESSION_DURATION_SECONDS: i64 = 7 * 24 * 60 * 60;

/// Maximum price staleness: 60 seconds
pub const MAX_PRICE_AGE_SECONDS: u64 = 60;

/// Grace period for claiming winnings before round can be closed: 1 hour
/// After this period, authority can close the round and reclaim rent
/// Unclaimed winnings are forfeited to the protocol
pub const CLAIM_GRACE_PERIOD_SECONDS: i64 = 60 * 60;

/// Price feed ID for BTC/USD (Pyth mainnet)
/// Can be updated via set_price_feed instruction
pub const DEFAULT_PRICE_FEED_ID: [u8; 32] = [
    0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
    0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
    0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
    0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
];

// ===================
// Program
// ===================

#[program]
pub mod session_betting {
    use super::*;

    // =====================
    // Admin Instructions
    // =====================

    /// Initialize the global game state (called once on deployment)
    /// Only the deployer becomes the authority
    pub fn initialize_game(ctx: Context<InitializeGame>, price_feed_id: [u8; 32]) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        game_state.authority = ctx.accounts.authority.key();
        game_state.pending_authority = None;
        game_state.price_feed_id = price_feed_id;
        game_state.current_round = 0;
        game_state.total_volume = 0;
        game_state.total_fees_collected = 0;
        game_state.is_paused = false;
        game_state.bump = ctx.bumps.game_state;
        Ok(())
    }

    /// Start a new betting round with the current price
    /// Authority only - backend reads price from oracle and submits
    pub fn start_round(ctx: Context<StartRound>, start_price: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let round = &mut ctx.accounts.round;
        let pool = &mut ctx.accounts.pool;

        // SECURITY: Validate authority
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: Game not paused
        require!(!game_state.is_paused, SessionBettingError::GamePaused);

        // SECURITY: Valid price
        require!(start_price > 0, SessionBettingError::InvalidPrice);

        let clock = Clock::get()?;
        let round_id = game_state.current_round;

        // Initialize round
        round.round_id = round_id;
        round.start_time = clock.unix_timestamp;
        round.lock_time = clock.unix_timestamp + ROUND_DURATION_SECONDS - LOCK_BUFFER_SECONDS;
        round.end_time = clock.unix_timestamp + ROUND_DURATION_SECONDS;
        // Fallback allows permissionless locking after authority timeout
        round.lock_time_fallback = round.lock_time + FALLBACK_LOCK_DELAY_SECONDS;
        round.start_price = start_price;
        round.end_price = 0;
        round.status = RoundStatus::Open;
        round.winner = WinnerSide::None;
        round.bump = ctx.bumps.round;

        // Initialize pool
        pool.round_id = round_id;
        pool.up_pool = 0;
        pool.down_pool = 0;
        pool.total_pool = 0;
        pool.bump = ctx.bumps.pool;

        // Increment round counter
        game_state.current_round = game_state.current_round.checked_add(1)
            .ok_or(SessionBettingError::MathOverflow)?;
        Ok(())
    }

    /// Lock the round with price from Pyth oracle - AUTHORITY ONLY
    /// Uses Pyth oracle for tamper-proof price data
    pub fn lock_round(ctx: Context<LockRound>) -> Result<()> {
        let game_state = &ctx.accounts.game_state;
        let round = &mut ctx.accounts.round;
        let price_account = &ctx.accounts.price_feed;

        // SECURITY: Authority only - prevents griefing attacks
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: Round must be open
        require!(round.status == RoundStatus::Open, SessionBettingError::RoundNotOpen);

        let clock = Clock::get()?;

        // SECURITY: Must be after lock_time
        require!(
            clock.unix_timestamp >= round.lock_time,
            SessionBettingError::TooEarlyToLock
        );

        // SECURITY: Load and validate price from Pyth oracle
        let price_feed = load_price_feed_from_account_info(price_account)
            .map_err(|_| SessionBettingError::InvalidPriceFeed)?;

        // SECURITY: Verify price feed ID matches configured feed
        require!(
            price_feed.id.to_bytes() == game_state.price_feed_id,
            SessionBettingError::PriceFeedMismatch
        );

        // SECURITY: Get price with staleness check
        let current_time = clock.unix_timestamp;
        let price = price_feed.get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)
            .ok_or(SessionBettingError::PriceTooStale)?;

        // SECURITY: Price must be positive
        require!(price.price > 0, SessionBettingError::InvalidPrice);

        // Convert price to u64 (price is i64 in Pyth)
        let end_price = price.price as u64;

        round.end_price = end_price;
        round.status = RoundStatus::Locked;
        Ok(())
    }

    /// Lock the round with price from Pyth oracle - PERMISSIONLESS FALLBACK
    /// Anyone can call after lock_time_fallback has passed
    /// This prevents rounds from getting stuck if authority goes offline
    /// SECURITY: Uses Pyth oracle for tamper-proof pricing (no arbitrary price input)
    pub fn lock_round_fallback(ctx: Context<LockRoundFallback>) -> Result<()> {
        let game_state = &ctx.accounts.game_state;
        let round = &mut ctx.accounts.round;
        let price_account = &ctx.accounts.price_feed;

        // SECURITY: Round must be open
        require!(round.status == RoundStatus::Open, SessionBettingError::RoundNotOpen);

        let clock = Clock::get()?;

        // SECURITY: Must be after lock_time_fallback (gives authority priority window)
        require!(
            clock.unix_timestamp >= round.lock_time_fallback,
            SessionBettingError::TooEarlyForFallback
        );

        // SECURITY: Load and validate price from Pyth oracle
        let price_feed = load_price_feed_from_account_info(price_account)
            .map_err(|_| SessionBettingError::InvalidPriceFeed)?;

        // SECURITY: Verify price feed ID matches configured feed
        require!(
            price_feed.id.to_bytes() == game_state.price_feed_id,
            SessionBettingError::PriceFeedMismatch
        );

        // SECURITY: Get price with staleness check
        // This prevents price manipulation even in permissionless fallback
        let current_time = clock.unix_timestamp;
        let price = price_feed.get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)
            .ok_or(SessionBettingError::PriceTooStale)?;

        // SECURITY: Price must be positive
        require!(price.price > 0, SessionBettingError::InvalidPrice);

        // Convert price to u64 (price is i64 in Pyth)
        let end_price = price.price as u64;

        round.end_price = end_price;
        round.status = RoundStatus::Locked;
        Ok(())
    }

    /// Settle the round - determines winner side
    /// Permissionless - anyone can call after round is locked
    pub fn settle_round(ctx: Context<SettleRound>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let round = &mut ctx.accounts.round;
        let pool = &ctx.accounts.pool;

        // SECURITY: Round must be locked
        require!(round.status == RoundStatus::Locked, SessionBettingError::RoundNotLocked);

        let clock = Clock::get()?;

        // SECURITY: Must be after end_time
        require!(
            clock.unix_timestamp >= round.end_time,
            SessionBettingError::TooEarlyToSettle
        );

        // Determine winner
        let winner = if round.end_price > round.start_price {
            WinnerSide::Up
        } else if round.end_price < round.start_price {
            WinnerSide::Down
        } else {
            WinnerSide::Draw
        };

        round.winner = winner;
        round.status = RoundStatus::Settled;

        // Update stats
        game_state.total_volume = game_state.total_volume
            .checked_add(pool.total_pool)
            .ok_or(SessionBettingError::MathOverflow)?;
        Ok(())
    }

    /// Close a settled round and reclaim rent
    /// AUTHORITY ONLY - can only be called after grace period
    /// Any unclaimed winnings are forfeited to the protocol
    pub fn close_round(ctx: Context<CloseRound>) -> Result<()> {
        let game_state = &ctx.accounts.game_state;
        let round = &ctx.accounts.round;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: Round must be settled
        require!(
            round.status == RoundStatus::Settled,
            SessionBettingError::RoundNotSettled
        );

        let clock = Clock::get()?;

        // SECURITY: Must be after grace period
        let close_time = round.end_time
            .checked_add(CLAIM_GRACE_PERIOD_SECONDS)
            .ok_or(SessionBettingError::MathOverflow)?;

        require!(
            clock.unix_timestamp >= close_time,
            SessionBettingError::GracePeriodNotOver
        );

        // Accounts are closed via the close constraint in CloseRound
        // Rent is returned to authority
        Ok(())
    }

    /// Pause/unpause the game (emergency only)
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        game_state.is_paused = paused;
        Ok(())
    }

    /// Update the Pyth price feed ID (authority only)
    pub fn set_price_feed(ctx: Context<SetPriceFeed>, price_feed_id: [u8; 32]) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        game_state.price_feed_id = price_feed_id;
        Ok(())
    }

    // =====================
    // Authority Transfer Instructions (Two-Step for Security)
    // =====================

    /// Step 1: Current authority proposes a new authority
    /// SECURITY: Two-step transfer prevents accidental lockout
    pub fn propose_authority_transfer(ctx: Context<ProposeAuthorityTransfer>, new_authority: Pubkey) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // SECURITY: Current authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: New authority cannot be zero address
        require!(
            new_authority != Pubkey::default(),
            SessionBettingError::InvalidAuthority
        );

        game_state.pending_authority = Some(new_authority);

        emit!(AuthorityTransferProposed {
            current_authority: game_state.authority,
            pending_authority: new_authority,
        });
        Ok(())
    }

    /// Step 2: New authority accepts the transfer
    /// SECURITY: Only the pending authority can accept
    pub fn accept_authority_transfer(ctx: Context<AcceptAuthorityTransfer>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // SECURITY: Must have a pending authority
        let pending = game_state.pending_authority
            .ok_or(SessionBettingError::NoPendingAuthority)?;

        // SECURITY: Signer must be the pending authority
        require!(
            ctx.accounts.new_authority.key() == pending,
            SessionBettingError::Unauthorized
        );

        let old_authority = game_state.authority;
        game_state.authority = pending;
        game_state.pending_authority = None;

        emit!(AuthorityTransferred {
            old_authority,
            new_authority: pending,
        });
        Ok(())
    }

    /// Cancel a pending authority transfer
    /// SECURITY: Only current authority can cancel
    pub fn cancel_authority_transfer(ctx: Context<CancelAuthorityTransfer>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // SECURITY: Current authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: Must have a pending authority to cancel
        require!(
            game_state.pending_authority.is_some(),
            SessionBettingError::NoPendingAuthority
        );

        game_state.pending_authority = None;
        Ok(())
    }

    // =====================
    // Fee Withdrawal (Authority Only)
    // =====================

    /// Withdraw collected platform fees to authority wallet
    /// SECURITY: Authority only, tracks withdrawal amount
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: Amount must be positive
        require!(amount > 0, SessionBettingError::AmountTooSmall);

        // SECURITY: Cannot withdraw more than collected fees
        require!(
            amount <= game_state.total_fees_collected,
            SessionBettingError::InsufficientFees
        );

        // SECURITY: Global vault must have sufficient balance
        require!(
            ctx.accounts.global_vault.lamports() >= amount,
            SessionBettingError::InsufficientVaultBalance
        );

        // Update fees collected BEFORE transfer (reentrancy protection)
        game_state.total_fees_collected = game_state.total_fees_collected
            .checked_sub(amount)
            .ok_or(SessionBettingError::MathOverflow)?;

        // Transfer from global vault to authority
        let bump = ctx.bumps.global_vault;
        let seeds: &[&[u8]] = &[b"global_vault", &[bump]];
        let signer_seeds = &[seeds];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.global_vault.to_account_info(),
                to: ctx.accounts.authority.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, amount)?;

        emit!(FeesWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            remaining_fees: game_state.total_fees_collected,
        });
        Ok(())
    }

    // =====================
    // Game Settlement Instructions (Authority Only)
    // =====================

    /// Transfer lamports from user's vault to global vault
    /// Used when user loses a game - their entry fee/bet goes to the pool
    /// AUTHORITY ONLY - backend calls this during settlement
    pub fn transfer_to_global_vault(ctx: Context<TransferToGlobalVault>, amount: u64) -> Result<()> {
        let game_state = &ctx.accounts.game_state;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: User must have sufficient balance
        let user_balance = &mut ctx.accounts.user_balance;
        require!(
            user_balance.balance >= amount,
            SessionBettingError::InsufficientBalance
        );

        // Update balance BEFORE transfer (reentrancy protection)
        user_balance.balance = user_balance.balance
            .checked_sub(amount)
            .ok_or(SessionBettingError::MathOverflow)?;

        // Transfer from user's vault to global vault
        let owner_key = ctx.accounts.owner.key();
        let seeds = &[
            b"vault",
            owner_key.as_ref(),
            &[ctx.bumps.user_vault],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_vault.to_account_info(),
                to: ctx.accounts.global_vault.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, amount)?;
        Ok(())
    }

    /// Credit winnings to user's balance and transfer lamports from global vault
    /// AUTHORITY ONLY - backend calls this to pay out winners
    pub fn credit_winnings(
        ctx: Context<CreditWinnings>,
        amount: u64,
        game_type: GameType,
        game_id: [u8; 32],
    ) -> Result<()> {
        let game_state = &ctx.accounts.game_state;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        // SECURITY: Amount must be positive
        require!(amount > 0, SessionBettingError::AmountTooSmall);

        // SECURITY: Global vault must have sufficient balance to pay out
        require!(
            ctx.accounts.global_vault.lamports() >= amount,
            SessionBettingError::InsufficientVaultBalance
        );

        let user_balance = &mut ctx.accounts.user_balance;

        // Credit to user balance
        user_balance.balance = user_balance.balance
            .checked_add(amount)
            .ok_or(SessionBettingError::MathOverflow)?;
        user_balance.total_winnings = user_balance.total_winnings
            .checked_add(amount)
            .ok_or(SessionBettingError::MathOverflow)?;

        // Transfer from global vault to user's vault
        let bump = ctx.bumps.global_vault;
        let seeds: &[&[u8]] = &[
            b"global_vault",
            &[bump],
        ];
        let signer_seeds = &[seeds];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.global_vault.to_account_info(),
                to: ctx.accounts.user_vault.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, amount)?;

        emit!(WinningsCredited {
            user: ctx.accounts.owner.key(),
            amount,
            game_type,
            game_id,
        });
        Ok(())
    }

    /// Fund the global vault (authority deposits funds for payouts)
    /// AUTHORITY ONLY
    pub fn fund_global_vault(ctx: Context<FundGlobalVault>, amount: u64) -> Result<()> {
        let game_state = &ctx.accounts.game_state;

        // SECURITY: Authority only
        require!(
            ctx.accounts.authority.key() == game_state.authority,
            SessionBettingError::Unauthorized
        );

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.global_vault.to_account_info(),
            },
        );
        transfer(cpi_context, amount)?;
        Ok(())
    }

    // =====================
    // Session Key Instructions
    // =====================

    /// Create a session token that authorizes a temporary key to act on behalf of the user
    /// REQUIRES wallet signature to create the session
    pub fn create_session(ctx: Context<CreateSession>, valid_until: i64) -> Result<()> {
        let session = &mut ctx.accounts.session_token;
        let clock = Clock::get()?;

        // SECURITY: Validate session duration isn't too long
        let duration = valid_until.checked_sub(clock.unix_timestamp)
            .ok_or(SessionBettingError::InvalidSessionDuration)?;
        require!(duration > 0, SessionBettingError::InvalidSessionDuration);
        require!(
            duration <= MAX_SESSION_DURATION_SECONDS,
            SessionBettingError::SessionTooLong
        );

        session.authority = ctx.accounts.authority.key();
        session.session_signer = ctx.accounts.session_signer.key();
        session.valid_until = valid_until;
        session.bump = ctx.bumps.session_token;
        Ok(())
    }

    /// Revoke a session token (wallet signature required)
    pub fn revoke_session(_ctx: Context<RevokeSession>) -> Result<()> {
        // The account will be closed and rent returned to authority
        Ok(())
    }

    // =====================
    // User Balance Instructions
    // =====================

    /// Deposit SOL into user's balance account
    /// REQUIRES wallet signature - cannot use session key
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // SECURITY: Minimum deposit check
        require!(amount >= MIN_BET, SessionBettingError::AmountTooSmall);

        // SECURITY: Transfer SOL from user to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        transfer(cpi_context, amount)?;

        // Update balance
        let user_balance = &mut ctx.accounts.user_balance;
        user_balance.owner = ctx.accounts.user.key();
        user_balance.balance = user_balance.balance
            .checked_add(amount)
            .ok_or(SessionBettingError::MathOverflow)?;
        user_balance.total_deposited = user_balance.total_deposited
            .checked_add(amount)
            .ok_or(SessionBettingError::MathOverflow)?;
        user_balance.bump = ctx.bumps.user_balance;
        Ok(())
    }

    /// Withdraw SOL from user's balance account
    /// CRITICAL SECURITY: REQUIRES wallet signature - NEVER session key
    /// This prevents session key theft from draining funds
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;

        // SECURITY: Check ownership (wallet must sign, not session)
        require!(
            user_balance.owner == ctx.accounts.user.key(),
            SessionBettingError::NotBalanceOwner
        );

        // SECURITY: Check sufficient balance
        require!(
            user_balance.balance >= amount,
            SessionBettingError::InsufficientBalance
        );

        // SECURITY: Update state BEFORE transfer (reentrancy protection)
        user_balance.balance = user_balance.balance
            .checked_sub(amount)
            .ok_or(SessionBettingError::MathOverflow)?;
        user_balance.total_withdrawn = user_balance.total_withdrawn
            .checked_add(amount)
            .ok_or(SessionBettingError::MathOverflow)?;

        // Transfer from vault to user (PDA signs)
        let user_key = ctx.accounts.user.key();
        let seeds = &[
            b"vault",
            user_key.as_ref(),
            &[ctx.bumps.vault],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            signer_seeds,
        );
        transfer(cpi_context, amount)?;

        Ok(())
    }

    // =====================
    // Betting Instructions (Session Key Enabled)
    // =====================

    /// Place a bet on UP or DOWN
    /// Can use session key OR wallet signature
    pub fn place_bet(ctx: Context<PlaceBet>, side: BetSide, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;
        let round = &ctx.accounts.round;
        let pool = &mut ctx.accounts.pool;
        let position = &mut ctx.accounts.position;

        // SECURITY: Verify signer authority (session or wallet)
        verify_session_or_authority(
            &ctx.accounts.session_token,
            &ctx.accounts.signer,
            &user_balance.owner,
        )?;

        // SECURITY: Game not paused
        require!(
            !ctx.accounts.game_state.is_paused,
            SessionBettingError::GamePaused
        );

        // SECURITY: Round must be open
        require!(round.status == RoundStatus::Open, SessionBettingError::RoundNotOpen);

        // SECURITY: Not past lock time
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < round.lock_time,
            SessionBettingError::RoundLocked
        );

        // SECURITY: Valid bet amount
        require!(amount >= MIN_BET, SessionBettingError::AmountTooSmall);
        require!(amount <= MAX_BET, SessionBettingError::AmountTooLarge);

        // SECURITY: Sufficient balance
        require!(
            user_balance.balance >= amount,
            SessionBettingError::InsufficientBalance
        );

        // SECURITY: Update balance BEFORE recording bet (reentrancy protection)
        user_balance.balance = user_balance.balance
            .checked_sub(amount)
            .ok_or(SessionBettingError::MathOverflow)?;

        // Record position
        position.player = user_balance.owner;
        position.round_id = round.round_id;
        position.side = side;
        position.amount = amount;
        position.claimed = false;
        position.bump = ctx.bumps.position;

        // Update pool
        match side {
            BetSide::Up => {
                pool.up_pool = pool.up_pool
                    .checked_add(amount)
                    .ok_or(SessionBettingError::MathOverflow)?;
            }
            BetSide::Down => {
                pool.down_pool = pool.down_pool
                    .checked_add(amount)
                    .ok_or(SessionBettingError::MathOverflow)?;
            }
        }
        pool.total_pool = pool.total_pool
            .checked_add(amount)
            .ok_or(SessionBettingError::MathOverflow)?;

        Ok(())
    }

    /// Claim winnings after round is settled
    /// Can use session key OR wallet signature
    /// Winnings go to user's balance account (not direct wallet)
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let round = &ctx.accounts.round;
        let pool = &ctx.accounts.pool;
        let position = &mut ctx.accounts.position;
        let user_balance = &mut ctx.accounts.user_balance;

        // SECURITY: Verify signer authority (session or wallet)
        verify_session_or_authority(
            &ctx.accounts.session_token,
            &ctx.accounts.signer,
            &user_balance.owner,
        )?;

        // SECURITY: Round must be settled
        require!(
            round.status == RoundStatus::Settled,
            SessionBettingError::RoundNotSettled
        );

        // SECURITY: Position not already claimed
        require!(!position.claimed, SessionBettingError::AlreadyClaimed);

        // SECURITY: Position belongs to user
        require!(
            position.player == user_balance.owner,
            SessionBettingError::NotPositionOwner
        );

        // Calculate winnings
        let winnings = calculate_winnings(
            position.amount,
            position.side,
            round.winner,
            pool.up_pool,
            pool.down_pool,
        )?;

        // SECURITY: Mark as claimed BEFORE credit (reentrancy protection)
        position.claimed = true;

        if winnings > 0 {
            // Calculate fee
            let fee = winnings
                .checked_mul(PLATFORM_FEE_BPS)
                .ok_or(SessionBettingError::MathOverflow)?
                .checked_div(BPS_DENOMINATOR)
                .ok_or(SessionBettingError::MathOverflow)?;

            let payout = winnings
                .checked_sub(fee)
                .ok_or(SessionBettingError::MathOverflow)?;

            // Credit to user balance
            user_balance.balance = user_balance.balance
                .checked_add(payout)
                .ok_or(SessionBettingError::MathOverflow)?;
            user_balance.total_winnings = user_balance.total_winnings
                .checked_add(payout)
                .ok_or(SessionBettingError::MathOverflow)?;

            // Track fees
            game_state.total_fees_collected = game_state.total_fees_collected
                .checked_add(fee)
                .ok_or(SessionBettingError::MathOverflow)?;
        } else if round.winner == WinnerSide::Draw {
            // Refund on draw
            user_balance.balance = user_balance.balance
                .checked_add(position.amount)
                .ok_or(SessionBettingError::MathOverflow)?;
        }

        Ok(())
    }
}

// ===================
// Helper Functions
// ===================

#[inline]
fn verify_session_or_authority(
    session_token: &Option<Account<SessionToken>>,
    signer: &Signer,
    expected_authority: &Pubkey,
) -> Result<()> {
    // If signer is the authority directly, allow
    if signer.key() == *expected_authority {
        return Ok(());
    }

    // Otherwise, must have valid session token
    match session_token {
        Some(session) => {
            // SECURITY: Session must be for this authority
            require!(
                session.authority == *expected_authority,
                SessionBettingError::SessionAuthorityMismatch
            );

            // SECURITY: Signer must be the session signer
            require!(
                session.session_signer == signer.key(),
                SessionBettingError::InvalidSessionSigner
            );

            // SECURITY: Session must not be expired
            let clock = Clock::get()?;
            require!(
                clock.unix_timestamp < session.valid_until,
                SessionBettingError::SessionExpired
            );

            Ok(())
        }
        None => {
            // No session and not authority - unauthorized
            Err(SessionBettingError::Unauthorized.into())
        }
    }
}

#[inline]
fn calculate_winnings(
    bet_amount: u64,
    bet_side: BetSide,
    winner: WinnerSide,
    up_pool: u64,
    down_pool: u64,
) -> Result<u64> {
    // Check if user won
    let user_won = match (bet_side, winner) {
        (BetSide::Up, WinnerSide::Up) => true,
        (BetSide::Down, WinnerSide::Down) => true,
        _ => false,
    };

    if !user_won {
        return Ok(0);
    }

    // Calculate share of losing pool
    let (winning_pool, losing_pool) = match winner {
        WinnerSide::Up => (up_pool, down_pool),
        WinnerSide::Down => (down_pool, up_pool),
        _ => return Ok(0),
    };

    // SECURITY: Prevent division by zero
    if winning_pool == 0 {
        return Ok(bet_amount);
    }

    // Winnings = bet_amount + (bet_amount / winning_pool * losing_pool)
    // Using u128 for intermediate calculation to prevent overflow
    let share = (bet_amount as u128)
        .checked_mul(losing_pool as u128)
        .ok_or(SessionBettingError::MathOverflow)?
        .checked_div(winning_pool as u128)
        .ok_or(SessionBettingError::MathOverflow)?;

    let winnings = (bet_amount as u128)
        .checked_add(share)
        .ok_or(SessionBettingError::MathOverflow)?;

    // SECURITY: Ensure result fits in u64
    if winnings > u64::MAX as u128 {
        return Err(SessionBettingError::MathOverflow.into());
    }

    Ok(winnings as u64)
}

// ===================
// Account Structs
// ===================

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GameState::INIT_SPACE,
        seeds = [b"game"],
        bump
    )]
    pub game_state: Account<'info, GameState>,

    /// Global vault PDA for pooled game funds - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"global_vault"],
        bump
    )]
    pub global_vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartRound<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        init,
        payer = authority,
        space = 8 + BettingRound::INIT_SPACE,
        seeds = [b"round", game_state.current_round.to_le_bytes().as_ref()],
        bump
    )]
    pub round: Account<'info, BettingRound>,

    #[account(
        init,
        payer = authority,
        space = 8 + BettingPool::INIT_SPACE,
        seeds = [b"pool", game_state.current_round.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, BettingPool>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockRound<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, BettingRound>,

    /// CHECK: Pyth price feed account - validated in instruction
    pub price_feed: AccountInfo<'info>,

    /// Authority must sign to prevent griefing
    pub authority: Signer<'info>,
}

/// Permissionless fallback for locking rounds when authority is offline
/// SECURITY: Uses Pyth oracle price - no arbitrary price input allowed
#[derive(Accounts)]
pub struct LockRoundFallback<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, BettingRound>,

    /// CHECK: Pyth price feed account - validated in instruction
    pub price_feed: AccountInfo<'info>,

    /// Anyone can call this after fallback time
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleRound<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, BettingRound>,

    #[account(
        seeds = [b"pool", round.round_id.to_le_bytes().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, BettingPool>,

    pub caller: Signer<'info>,
}

/// Close a settled round and reclaim rent
/// Authority only, after grace period
#[derive(Accounts)]
pub struct CloseRound<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump,
        close = authority
    )]
    pub round: Account<'info, BettingRound>,

    #[account(
        mut,
        seeds = [b"pool", round.round_id.to_le_bytes().as_ref()],
        bump = pool.bump,
        close = authority
    )]
    pub pool: Account<'info, BettingPool>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPriceFeed<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    pub authority: Signer<'info>,
}

/// Propose a new authority (two-step transfer)
#[derive(Accounts)]
pub struct ProposeAuthorityTransfer<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    pub authority: Signer<'info>,
}

/// Accept authority transfer (must be signed by pending authority)
#[derive(Accounts)]
pub struct AcceptAuthorityTransfer<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    /// The new authority accepting the transfer
    pub new_authority: Signer<'info>,
}

/// Cancel a pending authority transfer
#[derive(Accounts)]
pub struct CancelAuthorityTransfer<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    pub authority: Signer<'info>,
}

/// Withdraw collected platform fees
#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Global vault PDA for pooled funds
    #[account(
        mut,
        seeds = [b"global_vault"],
        bump
    )]
    pub global_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSession<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SessionToken::INIT_SPACE,
        seeds = [b"session", authority.key().as_ref(), session_signer.key().as_ref()],
        bump
    )]
    pub session_token: Account<'info, SessionToken>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: The session signer public key (does not need to sign creation)
    pub session_signer: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"session", authority.key().as_ref(), session_token.session_signer.as_ref()],
        bump = session_token.bump,
        constraint = session_token.authority == authority.key() @ SessionBettingError::NotSessionOwner
    )]
    pub session_token: Account<'info, SessionToken>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserBalance::INIT_SPACE,
        seeds = [b"balance", user.key().as_ref()],
        bump
    )]
    pub user_balance: Account<'info, UserBalance>,

    /// Vault PDA to hold user's funds - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"balance", user.key().as_ref()],
        bump = user_balance.bump,
        constraint = user_balance.owner == user.key() @ SessionBettingError::NotBalanceOwner
    )]
    pub user_balance: Account<'info, UserBalance>,

    /// Vault PDA that holds user's funds - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(side: BetSide, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, BettingRound>,

    #[account(
        mut,
        seeds = [b"pool", round.round_id.to_le_bytes().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, BettingPool>,

    #[account(
        mut,
        seeds = [b"balance", user_balance.owner.as_ref()],
        bump = user_balance.bump
    )]
    pub user_balance: Account<'info, UserBalance>,

    #[account(
        init,
        payer = signer,
        space = 8 + PlayerPosition::INIT_SPACE,
        seeds = [b"position", round.round_id.to_le_bytes().as_ref(), user_balance.owner.as_ref()],
        bump
    )]
    pub position: Account<'info, PlayerPosition>,

    /// Session token for session key authentication (optional)
    /// If provided, allows session_signer to act on behalf of authority
    #[account(
        seeds = [b"session", user_balance.owner.as_ref(), signer.key().as_ref()],
        bump = session_token.bump,
    )]
    pub session_token: Option<Account<'info, SessionToken>>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        seeds = [b"round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, BettingRound>,

    #[account(
        seeds = [b"pool", round.round_id.to_le_bytes().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, BettingPool>,

    #[account(
        mut,
        seeds = [b"balance", user_balance.owner.as_ref()],
        bump = user_balance.bump
    )]
    pub user_balance: Account<'info, UserBalance>,

    #[account(
        mut,
        seeds = [b"position", round.round_id.to_le_bytes().as_ref(), user_balance.owner.as_ref()],
        bump = position.bump,
        constraint = position.player == user_balance.owner @ SessionBettingError::NotPositionOwner
    )]
    pub position: Account<'info, PlayerPosition>,

    /// Session token for session key authentication (optional)
    #[account(
        seeds = [b"session", user_balance.owner.as_ref(), signer.key().as_ref()],
        bump = session_token.bump,
    )]
    pub session_token: Option<Account<'info, SessionToken>>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

// ===================
// Game Settlement Account Structs (Authority Only)
// ===================

/// Transfer lamports from user vault to global vault (for losses)
#[derive(Accounts)]
pub struct TransferToGlobalVault<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: User wallet (not signer - backend acts on their behalf)
    pub owner: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"balance", owner.key().as_ref()],
        bump = user_balance.bump
    )]
    pub user_balance: Account<'info, UserBalance>,

    /// User's vault PDA - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub user_vault: SystemAccount<'info>,

    /// Global vault PDA for pooled funds - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"global_vault"],
        bump
    )]
    pub global_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Credit winnings from global vault to user vault
#[derive(Accounts)]
pub struct CreditWinnings<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: User wallet (not signer - backend credits on their behalf)
    pub owner: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"balance", owner.key().as_ref()],
        bump = user_balance.bump
    )]
    pub user_balance: Account<'info, UserBalance>,

    /// User's vault PDA - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub user_vault: SystemAccount<'info>,

    /// Global vault PDA for pooled funds - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"global_vault"],
        bump
    )]
    pub global_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Fund the global vault (authority deposits for payouts)
#[derive(Accounts)]
pub struct FundGlobalVault<'info> {
    #[account(
        seeds = [b"game"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Global vault PDA for pooled funds - uses SystemAccount for type safety
    #[account(
        mut,
        seeds = [b"global_vault"],
        bump
    )]
    pub global_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ===================
// State Accounts
// ===================

#[account]
#[derive(InitSpace)]
pub struct GameState {
    pub authority: Pubkey,
    /// Pending authority for two-step transfer (security: prevents accidental lockout)
    pub pending_authority: Option<Pubkey>,
    /// Pyth price feed ID for oracle price validation
    pub price_feed_id: [u8; 32],
    pub current_round: u64,
    pub total_volume: u64,
    pub total_fees_collected: u64,
    pub is_paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BettingRound {
    pub round_id: u64,
    pub start_time: i64,
    pub lock_time: i64,
    pub end_time: i64,
    /// Fallback time after which anyone can lock the round (decentralization)
    pub lock_time_fallback: i64,
    pub start_price: u64,
    pub end_price: u64,
    pub status: RoundStatus,
    pub winner: WinnerSide,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BettingPool {
    pub round_id: u64,
    pub up_pool: u64,
    pub down_pool: u64,
    pub total_pool: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserBalance {
    pub owner: Pubkey,
    pub balance: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub total_winnings: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PlayerPosition {
    pub player: Pubkey,
    pub round_id: u64,
    pub side: BetSide,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SessionToken {
    /// The wallet that created this session
    pub authority: Pubkey,
    /// The temporary signer authorized by this session
    pub session_signer: Pubkey,
    /// Unix timestamp when this session expires
    pub valid_until: i64,
    /// PDA bump
    pub bump: u8,
}

// ===================
// Enums
// ===================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BetSide {
    Up,
    Down,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RoundStatus {
    Open,
    Locked,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum WinnerSide {
    None,
    Up,
    Down,
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GameType {
    Oracle,
    Battle,
    Draft,
    Spectator,
}

// ===================
// Events
// ===================

/// Emitted when winnings are credited to a user's balance
#[event]
pub struct WinningsCredited {
    pub user: Pubkey,
    pub amount: u64,
    pub game_type: GameType,
    pub game_id: [u8; 32],
}

/// Emitted when authority transfer is proposed
#[event]
pub struct AuthorityTransferProposed {
    pub current_authority: Pubkey,
    pub pending_authority: Pubkey,
}

/// Emitted when authority transfer is completed
#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}

/// Emitted when fees are withdrawn
#[event]
pub struct FeesWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub remaining_fees: u64,
}

// ===================
// Errors
// ===================

#[error_code]
pub enum SessionBettingError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Paused")]
    GamePaused,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Bad feed")]
    InvalidPriceFeed,
    #[msg("Feed mismatch")]
    PriceFeedMismatch,
    #[msg("Price stale")]
    PriceTooStale,
    #[msg("Not open")]
    RoundNotOpen,
    #[msg("Locked")]
    RoundLocked,
    #[msg("Too early")]
    TooEarlyToLock,
    #[msg("Fallback too early")]
    TooEarlyForFallback,
    #[msg("Not locked")]
    RoundNotLocked,
    #[msg("Too early")]
    TooEarlyToSettle,
    #[msg("Not settled")]
    RoundNotSettled,
    #[msg("Grace period")]
    GracePeriodNotOver,
    #[msg("Below min")]
    AmountTooSmall,
    #[msg("Above max")]
    AmountTooLarge,
    #[msg("Low balance")]
    InsufficientBalance,
    #[msg("Low vault")]
    InsufficientVaultBalance,
    #[msg("Low fees")]
    InsufficientFees,
    #[msg("Not owner")]
    NotBalanceOwner,
    #[msg("Not owner")]
    NotPositionOwner,
    #[msg("Claimed")]
    AlreadyClaimed,
    #[msg("Overflow")]
    MathOverflow,
    #[msg("Bad duration")]
    InvalidSessionDuration,
    #[msg("Too long")]
    SessionTooLong,
    #[msg("Expired")]
    SessionExpired,
    #[msg("Mismatch")]
    SessionAuthorityMismatch,
    #[msg("Bad signer")]
    InvalidSessionSigner,
    #[msg("Not owner")]
    NotSessionOwner,
    #[msg("Bad authority")]
    InvalidAuthority,
    #[msg("No pending")]
    NoPendingAuthority,
}
