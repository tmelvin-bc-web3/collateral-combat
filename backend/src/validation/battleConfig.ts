import { z } from 'zod';

/**
 * Zod schema for battle configuration validation.
 * Validates entry fee, duration, mode, and max players.
 *
 * Entry fee: 0.01 to 5 SOL
 * Duration: 1800s (30min) or 3600s (1hr)
 * Mode: 'paper' or 'real'
 * Max players: 2 to 10
 */
export const BattleConfigSchema = z.object({
  entryFee: z.number()
    .min(0.01, 'Entry fee must be at least 0.01 SOL')
    .max(5, 'Entry fee cannot exceed 5 SOL'),
  duration: z.union([z.literal(1800), z.literal(3600)], {
    message: 'Duration must be 1800 (30min) or 3600 (1hr)',
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
