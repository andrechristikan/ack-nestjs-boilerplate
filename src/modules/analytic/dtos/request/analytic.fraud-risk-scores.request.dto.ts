import { z } from 'zod';

/** @public */
export const AnalyticFraudRiskScoresRequestSchema = z.strictObject({
    minScore: z.coerce.number().int().min(0).optional().meta({
        description: 'Minimum risk score filter',
        example: 30,
    }),
});

/** @public */
export type AnalyticFraudRiskScoresRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresRequestSchema
>;
