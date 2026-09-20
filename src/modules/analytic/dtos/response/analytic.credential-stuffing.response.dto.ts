import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one IP address failing logins across many accounts.
 * @public
 */
export const AnalyticCredentialStuffingResponseSchema = z.object({
    ipAddress: z.string().meta({
        description: 'IP address the failed logins came from',
        example: faker.internet.ip(),
    }),
    uniqueUsers: z.number().meta({
        description: 'Number of distinct accounts the IP address attempted',
        example: faker.number.int({ min: 0, max: 500 }),
    }),
    failCount: z.number().meta({
        description: 'Number of failed logins from the IP address',
        example: faker.number.int({ min: 0, max: 5000 }),
    }),
});

/**
 * One IP address failing logins across many accounts.
 * @public
 */
export type AnalyticCredentialStuffingResponseDto = z.infer<
    typeof AnalyticCredentialStuffingResponseSchema
>;
