import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes a fraud detector result that applies no thresholds: the count and its window.
 * @public
 */
export const AnalyticFraudSummaryResponseSchema = z.object({
    count: z.number().meta({
        description: 'Rows the detector flagged',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    window: z.string().nullable().meta({
        description: 'Window the detector scanned; null when it has none',
        example: '3600000',
    }),
});

/**
 * Fraud detector result without thresholds.
 * @public
 */
export type AnalyticFraudSummaryResponseDto = z.infer<
    typeof AnalyticFraudSummaryResponseSchema
>;
