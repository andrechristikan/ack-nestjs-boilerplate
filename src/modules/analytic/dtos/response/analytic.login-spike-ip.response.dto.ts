import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticLoginSpikeIpResponseSchema = z.object({
    ipAddress: z.string().meta({
        description: 'IP address the login attempts came from',
        example: faker.internet.ip(),
    }),
    uniqueUsers: z.number().meta({
        description: 'Number of distinct users the IP address attempted',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    attempts: z.number().meta({
        description: 'Number of login attempts from the IP address',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/** @public */
export type AnalyticLoginSpikeIpResponseDto = z.infer<
    typeof AnalyticLoginSpikeIpResponseSchema
>;
