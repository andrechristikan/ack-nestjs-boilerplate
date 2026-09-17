import { z } from 'zod';

/**
 * Shapes one user fraud risk score with its band and signals.
 * @public
 */
export const AnalyticFraudRiskScoreResponseSchema = z.strictObject({
    userId: z.string(),
    score: z.number(),
    band: z.string(),
    contributingSignalCodes: z.array(z.string()),
});

/**
 * Fraud risk score of one user.
 * @public
 */
export type AnalyticFraudRiskScoreResponseDto = z.infer<
    typeof AnalyticFraudRiskScoreResponseSchema
>;
