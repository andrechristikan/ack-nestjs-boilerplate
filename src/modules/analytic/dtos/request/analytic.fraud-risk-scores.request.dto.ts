import { z } from 'zod';

export const AnalyticFraudRiskScoresRequestSchema = z.strictObject({
    minScore: z.coerce.number().int().min(0).optional().meta({
        description: 'Minimum risk score filter',
        example: 30,
    }),
});

export type AnalyticFraudRiskScoresRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresRequestSchema
>;
