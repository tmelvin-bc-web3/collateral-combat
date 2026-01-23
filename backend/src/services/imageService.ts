/**
 * Image Service - Server-side image generation for social sharing
 *
 * Uses Satori for SVG generation and Sharp for PNG conversion.
 * Generates UFC-inspired battle result cards and fighter profile cards.
 *
 * Design Philosophy:
 * - UFC/Fight night aesthetic with dark backgrounds
 * - Orange accent (#ff5500) consistent with DegenDome branding
 * - Winner highlighted with green (#7fba00), loser subdued
 * - Clean typography using Inter font family
 */

import satori from 'satori';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// ===================
// Font Loading
// ===================

// Fonts loaded once at startup for performance
let interRegular: ArrayBuffer | null = null;
let interBold: ArrayBuffer | null = null;

function loadFonts(): void {
  if (!interRegular) {
    const fontPath = path.join(__dirname, '../../assets/fonts/Inter-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      interRegular = fs.readFileSync(fontPath).buffer.slice(
        fs.readFileSync(fontPath).byteOffset,
        fs.readFileSync(fontPath).byteOffset + fs.readFileSync(fontPath).byteLength
      );
    } else {
      console.warn('[ImageService] Inter-Regular.ttf not found at', fontPath);
    }
  }
  if (!interBold) {
    const fontPath = path.join(__dirname, '../../assets/fonts/Inter-Bold.ttf');
    if (fs.existsSync(fontPath)) {
      interBold = fs.readFileSync(fontPath).buffer.slice(
        fs.readFileSync(fontPath).byteOffset,
        fs.readFileSync(fontPath).byteOffset + fs.readFileSync(fontPath).byteLength
      );
    } else {
      console.warn('[ImageService] Inter-Bold.ttf not found at', fontPath);
    }
  }
}

// ===================
// Type Definitions
// ===================

export interface BattleResultData {
  battleId: string;
  winner: {
    wallet: string;
    displayName: string;
    pnl: number;
    pnlPercent: number;
  };
  loser: {
    wallet: string;
    displayName: string;
    pnl: number;
    pnlPercent: number;
  };
  duration: number; // in seconds
  entryFee: number; // in SOL
  prizeWon: number; // in SOL
  tradeCount: number;
  maxLeverage: number;
  biggestSwing: number; // PnL percent
  endedAt: number;
}

export interface FighterProfileData {
  wallet: string;
  displayName: string;
  wins: number;
  losses: number;
  winRate: number;
  elo: number;
  tier: string;
  bestStreak: number;
  totalPnl: number;
}

// ===================
// Satori Element Types
// ===================

// Satori uses a specific element format
interface SatoriElement {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriElement[] | SatoriElement | string;
    [key: string]: unknown;
  };
}

// ===================
// Image Service Class
// ===================

class ImageService {
  constructor() {
    loadFonts();
    console.log('[ImageService] Image service initialized');
  }

  /**
   * Generate a UFC-inspired battle result card
   * Size: 1200x630 (Twitter card dimensions)
   */
  async generateBattleResultCard(data: BattleResultData): Promise<Buffer> {
    const fonts = this.getFonts();

    // Build the card layout
    const element: SatoriElement = {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(180deg, #1a1512 0%, #0a0908 100%)',
          fontFamily: 'Inter',
          position: 'relative',
        },
        children: [
          // Top accent bar
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '4px',
                background: 'linear-gradient(90deg, #ff5500 0%, #ff8800 50%, #ff5500 100%)',
              },
            },
          },
          // Header
          this.buildHeader(),
          // Main content - Fighter comparison
          this.buildFighterComparison(data),
          // Stats bar
          this.buildStatsBar(data),
          // Footer
          this.buildFooter(),
        ],
      },
    };

    // Generate SVG with Satori
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(element as any, {
      width: 1200,
      height: 630,
      fonts,
    });

    // Convert SVG to PNG with Sharp
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generate a fighter profile card
   * Size: 600x315 (Twitter summary card dimensions)
   */
  async generateFighterProfileCard(data: FighterProfileData): Promise<Buffer> {
    const fonts = this.getFonts();

    const pnlColor = data.totalPnl >= 0 ? '#7fba00' : '#cc2200';
    const pnlSign = data.totalPnl >= 0 ? '+' : '';

    const element: SatoriElement = {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          height: '315px',
          background: 'linear-gradient(180deg, #1a1512 0%, #0a0908 100%)',
          fontFamily: 'Inter',
          padding: '30px',
        },
        children: [
          // Header with branding
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center' },
                    children: [
                      { type: 'span', props: { style: { color: '#ff5500', fontSize: '24px', fontWeight: 700 }, children: 'DEGEN' } },
                      { type: 'span', props: { style: { color: '#e8dfd4', fontSize: '24px', fontWeight: 700 }, children: 'DOME' } },
                    ],
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: '#ff5500',
                      fontSize: '16px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    },
                    children: data.tier.toUpperCase(),
                  },
                },
              ],
            },
          },
          // Fighter name and ELO
          {
            type: 'div',
            props: {
              style: { marginBottom: '20px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { color: '#e8dfd4', fontSize: '36px', fontWeight: 700 },
                    children: data.displayName,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#666', fontSize: '14px' },
                    children: `ELO: ${data.elo}`,
                  },
                },
              ],
            },
          },
          // Stats grid
          {
            type: 'div',
            props: {
              style: { display: 'flex', gap: '30px' },
              children: [
                this.profileStat('RECORD', `${data.wins}W - ${data.losses}L`),
                this.profileStat('WIN RATE', `${data.winRate.toFixed(0)}%`),
                this.profileStat('BEST STREAK', `${data.bestStreak}W`),
                this.profileStat('TOTAL P&L', `${pnlSign}${data.totalPnl.toFixed(2)} SOL`, pnlColor),
              ],
            },
          },
        ],
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(element as any, {
      width: 600,
      height: 315,
      fonts,
    });

    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  // ===================
  // Private Helper Methods
  // ===================

  private buildHeader(): SatoriElement {
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '30px 50px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                { type: 'span', props: { style: { color: '#ff5500', fontSize: '42px', fontWeight: 700 }, children: 'DEGEN' } },
                { type: 'span', props: { style: { color: '#e8dfd4', fontSize: '42px', fontWeight: 700 }, children: 'DOME' } },
              ],
            },
          },
          { type: 'span', props: { style: { color: '#555', fontSize: '20px' }, children: 'BATTLE RESULT' } },
        ],
      },
    };
  }

  private buildFighterComparison(data: BattleResultData): SatoriElement {
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flex: '1',
          padding: '0 50px',
          gap: '40px',
        },
        children: [
          // Winner side
          this.fighterCard(data.winner, true),
          // VS divider
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
              children: [
                { type: 'span', props: { style: { color: '#ff5500', fontSize: '36px', fontWeight: 700 }, children: 'VS' } },
              ],
            },
          },
          // Loser side
          this.fighterCard(data.loser, false),
        ],
      },
    };
  }

  private fighterCard(
    fighter: { wallet: string; displayName: string; pnl: number; pnlPercent: number },
    isWinner: boolean
  ): SatoriElement {
    const pnlColor = fighter.pnl >= 0 ? '#7fba00' : '#cc2200';
    const pnlSign = fighter.pnl >= 0 ? '+' : '';

    const children: SatoriElement[] = [];

    // Winner badge (only for winner)
    if (isWinner) {
      children.push({
        type: 'div',
        props: {
          style: {
            background: '#7fba00',
            color: 'black',
            padding: '6px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '16px',
          },
          children: 'WINNER',
        },
      });
    }

    // Name
    children.push({
      type: 'span',
      props: {
        style: { color: '#e8dfd4', fontSize: '28px', fontWeight: 600, marginBottom: '20px' },
        children: fighter.displayName,
      },
    });

    // PnL
    children.push({
      type: 'span',
      props: {
        style: { color: pnlColor, fontSize: '48px', fontWeight: 700 },
        children: `${pnlSign}${fighter.pnlPercent.toFixed(1)}%`,
      },
    });

    // Wallet
    children.push({
      type: 'span',
      props: {
        style: { color: '#555', fontSize: '14px', marginTop: '10px' },
        children: `${fighter.wallet.slice(0, 4)}...${fighter.wallet.slice(-4)}`,
      },
    });

    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: '1',
          padding: '30px',
          background: isWinner ? 'rgba(127, 186, 0, 0.1)' : 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: isWinner ? '2px solid rgba(127, 186, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
        },
        children,
      },
    };
  }

  private buildStatsBar(data: BattleResultData): SatoriElement {
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          justifyContent: 'center',
          gap: '60px',
          padding: '30px 50px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        },
        children: [
          this.statBadge('DURATION', this.formatDuration(data.duration)),
          this.statBadge('ENTRY FEE', `${data.entryFee.toFixed(2)} SOL`),
          this.statBadge('PRIZE', `${data.prizeWon.toFixed(2)} SOL`),
          this.statBadge('TRADES', data.tradeCount.toString()),
          this.statBadge('MAX LEV', `${data.maxLeverage}x`),
        ],
      },
    };
  }

  private statBadge(label: string, value: string): SatoriElement {
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        },
        children: [
          { type: 'span', props: { style: { color: '#666', fontSize: '12px', textTransform: 'uppercase' }, children: label } },
          { type: 'span', props: { style: { color: '#e8dfd4', fontSize: '20px', fontWeight: 600 }, children: value } },
        ],
      },
    };
  }

  private buildFooter(): SatoriElement {
    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        },
        children: [
          { type: 'span', props: { style: { color: '#444', fontSize: '16px' }, children: 'degendome.xyz' } },
        ],
      },
    };
  }

  private profileStat(label: string, value: string, valueColor: string = '#e8dfd4'): SatoriElement {
    return {
      type: 'div',
      props: {
        children: [
          { type: 'div', props: { style: { color: '#666', fontSize: '10px', textTransform: 'uppercase' }, children: label } },
          { type: 'div', props: { style: { color: valueColor, fontSize: '18px', fontWeight: 600 }, children: value } },
        ],
      },
    };
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private getFonts(): Array<{ name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900; style: 'normal' }> {
    const fonts: Array<{ name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900; style: 'normal' }> = [];

    if (interRegular) {
      fonts.push({
        name: 'Inter',
        data: interRegular,
        weight: 400,
        style: 'normal',
      });
    }

    if (interBold) {
      fonts.push({
        name: 'Inter',
        data: interBold,
        weight: 700,
        style: 'normal',
      });
    }

    return fonts;
  }
}

// ===================
// Export Singleton
// ===================

export const imageService = new ImageService();
