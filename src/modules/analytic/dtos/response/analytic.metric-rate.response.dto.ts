import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticMetricRateResponseSchema = z.object({
    count: z.number().meta({
        description: 'Number of rows matching the metric window',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    total: z.number().meta({
        description: 'Number of rows the count is measured against',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
    rate: z.number().meta({
        description: 'Count divided by total, as a percentage between 0-100',
        example: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    }),
});

/** @public */
export type AnalyticMetricRateResponseDto = z.infer<
    typeof AnalyticMetricRateResponseSchema
>;
