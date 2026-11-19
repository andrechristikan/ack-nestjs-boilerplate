import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticAnomalySummaryResponseSchema = z.object({
    count: z.number().meta({
        description: 'Rows the detector flagged',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    windowStart: z.date().nullable().meta({
        description:
            'Start of the window the detector scanned; null when it has none',
        example: faker.date.recent(),
    }),
    windowEnd: z.date().nullable().meta({
        description:
            'End of the window the detector scanned; null when it has none',
        example: faker.date.recent(),
    }),
    computedAt: z.date().nullable().meta({
        description:
            'When a scheduled job last computed the result; null for a result computed on request or not computed yet',
        example: faker.date.recent(),
    }),
});

/** @public */
export type AnalyticAnomalySummaryResponseDto = z.infer<
    typeof AnalyticAnomalySummaryResponseSchema
>;
