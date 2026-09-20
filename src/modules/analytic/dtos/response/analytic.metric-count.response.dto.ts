import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes a single counted analytics metric.
 * @public
 */
export const AnalyticMetricCountResponseSchema = z.object({
    count: z.number().meta({
        description: 'Number of rows matching the metric window',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/**
 * Single counted analytics metric.
 * @public
 */
export type AnalyticMetricCountResponseDto = z.infer<
    typeof AnalyticMetricCountResponseSchema
>;
