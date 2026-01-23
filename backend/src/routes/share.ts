/**
 * Share Routes - Image serving endpoints for social sharing
 *
 * Serves dynamically generated PNG images for:
 * - Battle result cards (Twitter card preview)
 * - Fighter profile cards
 *
 * Images are generated server-side using Satori + Sharp and served
 * with proper caching headers for Open Graph/Twitter card compatibility.
 */

import { Router, Request, Response } from 'express';
import { imageService, BattleResultData, FighterProfileData } from '../services/imageService';
import { battleManager } from '../services/battleManager';
import * as eloDb from '../db/eloDatabase';
import * as eloService from '../services/eloService';
import { PLATFORM_FEE_PERCENT } from '../utils/fees';

export const shareRouter = Router();

// ===================
// Battle Result Image
// ===================

/**
 * GET /api/share/battle/:id/image
 *
 * Generates and serves a PNG image of a battle result card.
 * Used for Twitter/Open Graph previews when sharing battle results.
 */
shareRouter.get('/battle/:id/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get battle data
    const battle = battleManager.getBattle(id);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.status !== 'completed') {
      res.status(400).json({ error: 'Battle not completed yet' });
      return;
    }

    // Get both players
    const player1 = battle.players[0];
    const player2 = battle.players[1];

    if (!player1 || !player2) {
      res.status(400).json({ error: 'Battle missing players' });
      return;
    }

    // Determine winner and loser
    const winner = battle.winnerId === player1.walletAddress ? player1 : player2;
    const loser = battle.winnerId === player1.walletAddress ? player2 : player1;

    // Build display names (truncated wallets)
    const formatWallet = (wallet: string) => `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

    // Calculate trade count from both players
    const tradeCount = (player1.trades?.length || 0) + (player2.trades?.length || 0);

    // Calculate max leverage used
    const allLeverages = [
      ...(player1.trades?.map(t => t.leverage) || [1]),
      ...(player2.trades?.map(t => t.leverage) || [1]),
    ];
    const maxLeverage = Math.max(...allLeverages, 1);

    // Calculate prize after platform fee
    const prizeAfterFee = battle.prizePool * (1 - PLATFORM_FEE_PERCENT / 100);

    // Calculate duration
    const duration = battle.endedAt && battle.startedAt
      ? Math.floor((battle.endedAt - battle.startedAt) / 1000)
      : battle.config.duration;

    // Build result data for image generation
    const resultData: BattleResultData = {
      battleId: battle.id,
      winner: {
        wallet: winner.walletAddress,
        displayName: formatWallet(winner.walletAddress),
        pnl: winner.finalPnl || winner.account.totalPnlPercent,
        pnlPercent: winner.finalPnl || winner.account.totalPnlPercent,
      },
      loser: {
        wallet: loser.walletAddress,
        displayName: formatWallet(loser.walletAddress),
        pnl: loser.finalPnl || loser.account.totalPnlPercent,
        pnlPercent: loser.finalPnl || loser.account.totalPnlPercent,
      },
      duration,
      entryFee: battle.config.entryFee,
      prizeWon: prizeAfterFee,
      tradeCount,
      maxLeverage,
      biggestSwing: 0, // Could calculate from trade history if needed
      endedAt: battle.endedAt || Date.now(),
    };

    // Generate the image
    const imageBuffer = await imageService.generateBattleResultCard(resultData);

    // Set response headers for image serving
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Content-Length': imageBuffer.length.toString(),
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('[ShareRouter] Error generating battle image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// ===================
// Fighter Profile Image
// ===================

/**
 * GET /api/share/fighter/:wallet/image
 *
 * Generates and serves a PNG image of a fighter profile card.
 * Shows record, ELO, tier, win rate, and other stats.
 */
shareRouter.get('/fighter/:wallet/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { wallet } = req.params;

    // Get fighter ELO data
    const eloData = await eloDb.getEloData(wallet);

    // Calculate stats (use defaults if no data)
    const wins = eloData?.wins || 0;
    const losses = eloData?.losses || 0;
    const totalBattles = wins + losses;
    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
    const elo = eloData?.elo || 1200;
    const battleCount = eloData?.battleCount || 0;

    // Get display tier
    const tier = eloService.getDisplayTier(elo, battleCount);

    // Build profile data for image generation
    const profileData: FighterProfileData = {
      wallet,
      displayName: `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
      wins,
      losses,
      winRate,
      elo,
      tier,
      bestStreak: 0, // Would need to track separately
      totalPnl: 0, // Would need to aggregate from battle history
    };

    // Generate the image
    const imageBuffer = await imageService.generateFighterProfileCard(profileData);

    // Set response headers for image serving
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour (profile changes more often)
      'Content-Length': imageBuffer.length.toString(),
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('[ShareRouter] Error generating fighter image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

console.log('[ShareRouter] Share routes loaded');
