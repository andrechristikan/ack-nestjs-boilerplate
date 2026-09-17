import { z } from 'zod';

/**
 * Validates the minimum score query for listing fraud risk scores.
 * @public
 */
export const AnalyticFraudRiskScoresRequestSchema = z.strictObject({
    minScore: z.coerce.number().int().min(0).optional().meta({
        description: 'Minimum risk score filter',
        example: 30,
    }),
});

/**
 * Fraud risk score list query.
 * @public
 */
export type AnalyticFraudRiskScoresRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresRequestSchema
>;
