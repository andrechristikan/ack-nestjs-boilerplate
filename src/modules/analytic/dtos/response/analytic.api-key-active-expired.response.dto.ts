import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes how many API keys are still active against how many have expired.
 * @public
 */
export const AnalyticApiKeyActiveExpiredResponseSchema = z.object({
    active: z.number().meta({
        description: 'API keys still usable',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    expired: z.number().meta({
        description: 'API keys past their expiry',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
});

/**
 * How many API keys are still active against how many have expired.
 * @public
 */
export type AnalyticApiKeyActiveExpiredResponseDto = z.infer<
    typeof AnalyticApiKeyActiveExpiredResponseSchema
>;
