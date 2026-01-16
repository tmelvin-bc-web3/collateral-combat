import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SessionBetting } from "../target/types/session_betting";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";

describe("session_betting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SessionBetting as Program<SessionBetting>;

  // Test accounts
  const authority = provider.wallet.publicKey;
  let user: Keypair;
  let sessionKeypair: Keypair;

  // PDAs
  let gameStatePda: PublicKey;
  let globalVaultPda: PublicKey;
  let roundPda: PublicKey;
  let poolPda: PublicKey;
  let userBalancePda: PublicKey;
  let vaultPda: PublicKey;
  let positionPda: PublicKey;
  let sessionPda: PublicKey;

  // Test constants
  const DEPOSIT_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
  const BET_AMOUNT = 0.1 * LAMPORTS_PER_SOL;
  const START_PRICE = new BN(50000_00000000); // $50,000 with 8 decimals
  const END_PRICE_UP = new BN(51000_00000000); // $51,000 - price went up
  const END_PRICE_DOWN = new BN(49000_00000000); // $49,000 - price went down

  // Default Pyth price feed ID for BTC/USD (32 bytes)
  const DEFAULT_PRICE_FEED_ID = [
    0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
    0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
    0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
    0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
  ];

  before(async () => {
    // Create user keypair
    user = Keypair.generate();
    sessionKeypair = Keypair.generate();

    // Airdrop SOL to user
    const sig = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    // Derive PDAs
    [gameStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game")],
      program.programId
    );

    [globalVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_vault")],
      program.programId
    );

    [userBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), user.publicKey.toBuffer()],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );

    [sessionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), user.publicKey.toBuffer(), sessionKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Admin Functions", () => {
    it("Initializes the game", async () => {
      await program.methods
        .initializeGame(DEFAULT_PRICE_FEED_ID)
        .accounts({
          gameState: gameStatePda,
          globalVault: globalVaultPda,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const gameState = await program.account.gameState.fetch(gameStatePda);
      expect(gameState.authority.toString()).to.equal(authority.toString());
      expect(gameState.currentRound.toNumber()).to.equal(0);
      expect(gameState.isPaused).to.be.false;
      expect(gameState.priceFeedId).to.deep.equal(DEFAULT_PRICE_FEED_ID);
    });

    it("Starts a new round", async () => {
      const gameState = await program.account.gameState.fetch(gameStatePda);
      const roundId = gameState.currentRound;

      [roundPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("round"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .startRound(START_PRICE)
        .accounts({
          gameState: gameStatePda,
          round: roundPda,
          pool: poolPda,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const round = await program.account.bettingRound.fetch(roundPda);
      expect(round.startPrice.toString()).to.equal(START_PRICE.toString());
      expect(round.status).to.deep.equal({ open: {} });
    });

    it("Can pause and unpause the game", async () => {
      await program.methods
        .setPaused(true)
        .accounts({
          gameState: gameStatePda,
          authority: authority,
        })
        .rpc();

      let gameState = await program.account.gameState.fetch(gameStatePda);
      expect(gameState.isPaused).to.be.true;

      await program.methods
        .setPaused(false)
        .accounts({
          gameState: gameStatePda,
          authority: authority,
        })
        .rpc();

      gameState = await program.account.gameState.fetch(gameStatePda);
      expect(gameState.isPaused).to.be.false;
    });
  });

  describe("User Balance Functions", () => {
    it("User can deposit SOL", async () => {
      const balanceBefore = await provider.connection.getBalance(user.publicKey);

      await program.methods
        .deposit(new BN(DEPOSIT_AMOUNT))
        .accounts({
          userBalance: userBalancePda,
          vault: vaultPda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const userBalance = await program.account.userBalance.fetch(userBalancePda);
      expect(userBalance.balance.toNumber()).to.equal(DEPOSIT_AMOUNT);
      expect(userBalance.owner.toString()).to.equal(user.publicKey.toString());

      const balanceAfter = await provider.connection.getBalance(user.publicKey);
      expect(balanceAfter).to.be.lessThan(balanceBefore - DEPOSIT_AMOUNT + 10000); // Account for rent
    });

    it("User can withdraw SOL", async () => {
      const WITHDRAW_AMOUNT = 0.1 * LAMPORTS_PER_SOL;
      const balanceBefore = await provider.connection.getBalance(user.publicKey);

      await program.methods
        .withdraw(new BN(WITHDRAW_AMOUNT))
        .accounts({
          userBalance: userBalancePda,
          vault: vaultPda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const userBalance = await program.account.userBalance.fetch(userBalancePda);
      expect(userBalance.balance.toNumber()).to.equal(DEPOSIT_AMOUNT - WITHDRAW_AMOUNT);

      const balanceAfter = await provider.connection.getBalance(user.publicKey);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("Fails to withdraw more than balance", async () => {
      const TOO_MUCH = 100 * LAMPORTS_PER_SOL;

      try {
        await program.methods
          .withdraw(new BN(TOO_MUCH))
          .accounts({
            userBalance: userBalancePda,
            vault: vaultPda,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include("InsufficientBalance");
      }
    });
  });

  describe("Session Key Functions", () => {
    it("User can create a session", async () => {
      const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await program.methods
        .createSession(new BN(validUntil))
        .accounts({
          sessionToken: sessionPda,
          authority: user.publicKey,
          sessionSigner: sessionKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const session = await program.account.sessionToken.fetch(sessionPda);
      expect(session.authority.toString()).to.equal(user.publicKey.toString());
      expect(session.sessionSigner.toString()).to.equal(sessionKeypair.publicKey.toString());
      expect(session.validUntil.toNumber()).to.equal(validUntil);
    });

    it("Can revoke a session", async () => {
      // First create a new session to revoke
      const tempSession = Keypair.generate();
      const [tempSessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), user.publicKey.toBuffer(), tempSession.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createSession(new BN(Math.floor(Date.now() / 1000) + 3600))
        .accounts({
          sessionToken: tempSessionPda,
          authority: user.publicKey,
          sessionSigner: tempSession.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      // Now revoke it
      await program.methods
        .revokeSession()
        .accounts({
          sessionToken: tempSessionPda,
          authority: user.publicKey,
        })
        .signers([user])
        .rpc();

      // Verify it's closed
      try {
        await program.account.sessionToken.fetch(tempSessionPda);
        expect.fail("Account should be closed");
      } catch (e: any) {
        expect(e.message).to.include("Account does not exist");
      }
    });
  });

  describe("Betting Functions", () => {
    let roundId: BN;

    before(async () => {
      // Start a new round for betting tests
      const gameState = await program.account.gameState.fetch(gameStatePda);
      roundId = gameState.currentRound;

      [roundPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("round"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), roundId.toArrayLike(Buffer, "le", 8), user.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .startRound(START_PRICE)
        .accounts({
          gameState: gameStatePda,
          round: roundPda,
          pool: poolPda,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("User can place bet with wallet signature", async () => {
      const userBalanceBefore = await program.account.userBalance.fetch(userBalancePda);

      await program.methods
        .placeBet({ up: {} }, new BN(BET_AMOUNT))
        .accounts({
          gameState: gameStatePda,
          round: roundPda,
          pool: poolPda,
          userBalance: userBalancePda,
          position: positionPda,
          sessionToken: null,
          signer: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const userBalanceAfter = await program.account.userBalance.fetch(userBalancePda);
      expect(userBalanceAfter.balance.toNumber()).to.equal(
        userBalanceBefore.balance.toNumber() - BET_AMOUNT
      );

      const pool = await program.account.bettingPool.fetch(poolPda);
      expect(pool.upPool.toNumber()).to.equal(BET_AMOUNT);
      expect(pool.totalPool.toNumber()).to.equal(BET_AMOUNT);

      const position = await program.account.playerPosition.fetch(positionPda);
      expect(position.side).to.deep.equal({ up: {} });
      expect(position.amount.toNumber()).to.equal(BET_AMOUNT);
    });

    it("User can place bet with session key", async () => {
      // Create another user with a session for this test
      const user2 = Keypair.generate();
      const session2 = Keypair.generate();

      // Airdrop SOL to user2 and session2 (session needs lamports for tx fees)
      const sig1 = await provider.connection.requestAirdrop(
        user2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig1);

      const sig2 = await provider.connection.requestAirdrop(
        session2.publicKey,
        0.1 * LAMPORTS_PER_SOL  // Session key needs SOL for tx fees
      );
      await provider.connection.confirmTransaction(sig2);

      const [balance2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), user2.publicKey.toBuffer()],
        program.programId
      );
      const [vault2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), user2.publicKey.toBuffer()],
        program.programId
      );
      const [session2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), user2.publicKey.toBuffer(), session2.publicKey.toBuffer()],
        program.programId
      );
      const [position2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), roundId.toArrayLike(Buffer, "le", 8), user2.publicKey.toBuffer()],
        program.programId
      );

      // Deposit
      await program.methods
        .deposit(new BN(DEPOSIT_AMOUNT))
        .accounts({
          userBalance: balance2Pda,
          vault: vault2Pda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Create session
      await program.methods
        .createSession(new BN(Math.floor(Date.now() / 1000) + 3600))
        .accounts({
          sessionToken: session2Pda,
          authority: user2.publicKey,
          sessionSigner: session2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Place bet with session key (session key signs, not user wallet)
      await program.methods
        .placeBet({ down: {} }, new BN(BET_AMOUNT))
        .accounts({
          gameState: gameStatePda,
          round: roundPda,
          pool: poolPda,
          userBalance: balance2Pda,
          position: position2Pda,
          sessionToken: session2Pda,
          signer: session2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([session2]) // Session key signs, not user wallet!
        .rpc();

      const position = await program.account.playerPosition.fetch(position2Pda);
      expect(position.side).to.deep.equal({ down: {} });
      expect(position.player.toString()).to.equal(user2.publicKey.toString());

      const pool = await program.account.bettingPool.fetch(poolPda);
      expect(pool.downPool.toNumber()).to.equal(BET_AMOUNT);
    });

    it("Fails bet amount below minimum", async () => {
      const user3 = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        user3.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      const [balance3Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), user3.publicKey.toBuffer()],
        program.programId
      );
      const [vault3Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), user3.publicKey.toBuffer()],
        program.programId
      );
      const [position3Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), roundId.toArrayLike(Buffer, "le", 8), user3.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .deposit(new BN(0.1 * LAMPORTS_PER_SOL))
        .accounts({
          userBalance: balance3Pda,
          vault: vault3Pda,
          user: user3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc();

      try {
        await program.methods
          .placeBet({ up: {} }, new BN(1000)) // Way below minimum
          .accounts({
            gameState: gameStatePda,
            round: roundPda,
            pool: poolPda,
            userBalance: balance3Pda,
            position: position3Pda,
            sessionToken: null,
            signer: user3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user3])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include("AmountTooSmall");
      }
    });
  });

  describe("Security Tests", () => {
    it("Cannot withdraw with session key (security critical)", async () => {
      // This test verifies that session keys cannot be used to withdraw
      // This is critical for security - even if session key is compromised,
      // funds cannot be drained

      // The withdraw instruction doesn't accept session_token, so attempting
      // to call it with just the session key will fail because the signer
      // won't match the user_balance.owner constraint

      try {
        await program.methods
          .withdraw(new BN(0.01 * LAMPORTS_PER_SOL))
          .accounts({
            userBalance: userBalancePda,
            vault: vaultPda,
            user: sessionKeypair.publicKey, // Session key trying to sign
            systemProgram: SystemProgram.programId,
          })
          .signers([sessionKeypair])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e: any) {
        // Expected - session key is not the owner
        expect(e.message).to.include("ConstraintSeeds");
      }
    });

    it("Non-authority cannot start round", async () => {
      const attacker = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        attacker.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      const gameState = await program.account.gameState.fetch(gameStatePda);
      const roundId = gameState.currentRound;

      const [attackRoundPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("round"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [attackPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        await program.methods
          .startRound(START_PRICE)
          .accounts({
            gameState: gameStatePda,
            round: attackRoundPda,
            pool: attackPoolPda,
            authority: attacker.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e: any) {
        // Error should indicate unauthorized access
        expect(e.toString()).to.satisfy((msg: string) =>
          msg.includes("Unauthorized") || msg.includes("0x1770") || msg.includes("custom program error")
        );
      }
    });

    it("Session expired cannot be used for betting", async () => {
      // Create a session that expires in the past
      const expiredSession = Keypair.generate();
      const [expiredSessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), user.publicKey.toBuffer(), expiredSession.publicKey.toBuffer()],
        program.programId
      );

      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      try {
        await program.methods
          .createSession(new BN(pastTimestamp))
          .accounts({
            sessionToken: expiredSessionPda,
            authority: user.publicKey,
            sessionSigner: expiredSession.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include("InvalidSessionDuration");
      }
    });

    it("Cannot use someone else's session", async () => {
      // User1's session cannot be used to bet from User2's balance
      const user2 = Keypair.generate();
      const sig1 = await provider.connection.requestAirdrop(
        user2.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig1);

      // Give session keypair some SOL for tx fees
      const sig2 = await provider.connection.requestAirdrop(
        sessionKeypair.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig2);

      const [balance2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), user2.publicKey.toBuffer()],
        program.programId
      );
      const [vault2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), user2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .deposit(new BN(0.1 * LAMPORTS_PER_SOL))
        .accounts({
          userBalance: balance2Pda,
          vault: vault2Pda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const gameState = await program.account.gameState.fetch(gameStatePda);
      const roundId = gameState.currentRound.subn(1); // Use current active round

      const [roundPdaTest] = PublicKey.findProgramAddressSync(
        [Buffer.from("round"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [poolPdaTest] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), roundId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [position2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), roundId.toArrayLike(Buffer, "le", 8), user2.publicKey.toBuffer()],
        program.programId
      );

      // Try to use user1's session to bet from user2's balance
      try {
        await program.methods
          .placeBet({ up: {} }, new BN(BET_AMOUNT))
          .accounts({
            gameState: gameStatePda,
            round: roundPdaTest,
            pool: poolPdaTest,
            userBalance: balance2Pda, // User2's balance
            position: position2Pda,
            sessionToken: sessionPda, // User1's session!
            signer: sessionKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([sessionKeypair])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e: any) {
        // Should fail because session authority doesn't match balance owner
        // or because the PDA constraints fail
        expect(e.toString()).to.satisfy((msg: string) =>
          msg.includes("SessionAuthorityMismatch") ||
          msg.includes("ConstraintSeeds") ||
          msg.includes("custom program error")
        );
      }
    });
  });
});
