import { z } from 'zod';

/**
 * Zod schema for battle configuration validation.
 * Validates entry fee, duration, mode, and max players.
 *
 * Entry fee: 0.01 to 10 SOL (extended for challenges)
 * Duration: Standard (1800s/30min, 3600s/1hr) or Challenge (60s, 120s, 180s, 300s)
 * Mode: 'paper' or 'real'
 * Max players: 2 to 10
 */
export const BattleConfigSchema = z.object({
  entryFee: z.number()
    .min(0.01, 'Entry fee must be at least 0.01 SOL')
    .max(10, 'Entry fee cannot exceed 10 SOL'),
  duration: z.union([
    // Challenge durations (1-5 minutes)
    z.literal(60), z.literal(120), z.literal(180), z.literal(300),
    // Standard battle durations (30min, 1hr)
    z.literal(1800), z.literal(3600),
  ], {
    message: 'Duration must be 60, 120, 180, 300 (challenges) or 1800, 3600 (standard)',
  }),
  mode: z.enum(['paper', 'real'], {
    message: 'Mode must be "paper" or "real"',
  }),
  maxPlayers: z.number()
    .int('Max players must be an integer')
    .min(2, 'Must have at least 2 players')
    .max(10, 'Cannot exceed 10 players'),
});

export type ValidatedBattleConfig = z.infer<typeof BattleConfigSchema>;

/**
 * Validate battle config, returning parsed config or throwing ZodError.
 */
export function validateBattleConfig(config: unknown): ValidatedBattleConfig {
  return BattleConfigSchema.parse(config);
}

/**
 * Safely validate battle config, returning result object.
 */
export function safeBattleConfigValidation(config: unknown) {
  return BattleConfigSchema.safeParse(config);
}
