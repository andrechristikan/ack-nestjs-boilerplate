import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one user logging in at an hour they historically do not use.
 * @public
 */
export const AnalyticLoginTimeAnomalyResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user who logged in',
        example: faker.string.uuid(),
    }),
    lastHour: z.number().meta({
        description: 'Hour of day the last login happened, from 0 to 23',
        example: faker.number.int({ min: 0, max: 23 }),
    }),
    historicalFrequencyPercent: z.number().meta({
        description: 'Share of the historical logins that fall on that hour',
        example: faker.number.float({ min: 0, max: 100 }),
    }),
});

/**
 * One user logging in at an hour they historically do not use.
 * @public
 */
export type AnalyticLoginTimeAnomalyResponseDto = z.infer<
    typeof AnalyticLoginTimeAnomalyResponseSchema
>;
