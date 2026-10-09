import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes an anomaly detector result that applies no thresholds: the count and its window.
 * @public
 */
export const AnalyticAnomalySummaryResponseSchema = z.object({
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
 * Anomaly detector result without thresholds.
 * @public
 */
export type AnalyticAnomalySummaryResponseDto = z.infer<
    typeof AnalyticAnomalySummaryResponseSchema
>;
