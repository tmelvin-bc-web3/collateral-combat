/**
 * Admin Routes - Handles all admin dashboard API endpoints
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { standardLimiter } from '../middleware/rateLimiter';
import * as adminService from '../services/adminService';

const router = Router();

// All routes in this file require admin authentication
router.use(requireAdmin());
router.use(standardLimiter);

/**
 * GET /api/admin/check
 * Simple endpoint to check if user is admin (uses JWT, no signature required)
 * If this returns 200, the user is verified as admin via their JWT token
 */
router.get('/check', (req: Request, res: Response) => {
  // If we get here, requireAdmin() middleware passed, so user is admin
  res.json({ isAdmin: true });
});

/**
 * GET /api/admin/overview
 * Combined stats for Overview tab
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getOverviewStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[AdminRoutes] /overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

/**
 * GET /api/admin/users/stats
 * User counts, balances, activity summary
 */
router.get('/users/stats', async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getUserStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[AdminRoutes] /users/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

/**
 * GET /api/admin/users/list
 * Paginated user list with balances
 */
router.get('/users/list', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await adminService.getUserList(limit, offset);
    res.json(result);
  } catch (error: any) {
    console.error('[AdminRoutes] /users/list error:', error);
    res.status(500).json({ error: 'Failed to fetch user list' });
  }
});

/**
 * GET /api/admin/games/stats
 * Oracle/battle/LDS volume & fees
 */
router.get('/games/stats', async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getGameStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[AdminRoutes] /games/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
});

/**
 * GET /api/admin/games/rounds
 * Recent oracle rounds
 */
router.get('/games/rounds', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const rounds = adminService.getRecentOracleRounds(limit);
    res.json({ rounds });
  } catch (error: any) {
    console.error('[AdminRoutes] /games/rounds error:', error);
    res.status(500).json({ error: 'Failed to fetch oracle rounds' });
  }
});

/**
 * GET /api/admin/health
 * System status, RPC health, errors
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await adminService.getHealthStatus();
    res.json(health);
  } catch (error: any) {
    console.error('[AdminRoutes] /health error:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

/**
 * GET /api/admin/metrics
 * Unified metrics endpoint for monitoring dashboard
 * Combines overview stats, game stats, and health in one response
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const [overview, games, health] = await Promise.all([
      adminService.getOverviewStats(),
      adminService.getGameStats(),
      adminService.getHealthStatus()
    ]);

    res.json({
      metrics: {
        // Key numbers for dashboard
        dau: overview.users.active24h,
        totalUsers: overview.users.total,
        matchesToday: games.oracle.roundsToday + games.battle.completedToday,
        volumeToday: games.oracle.volumeToday + games.battle.volumeToday,
        feesToday: games.oracle.volumeToday * 0.05 + games.battle.volumeToday * 0.05,
        activeMatches: games.battle.activeBattles,
        // Health summary
        systemStatus: health.backend.status,
        databaseStatus: health.database.status,
        memoryUsage: health.backend.memoryUsage,
        activeConnections: health.backend.connections,
        uptime: health.backend.uptime
      },
      // Full data for detailed views
      overview,
      games,
      health,
      generated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AdminRoutes] /metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
