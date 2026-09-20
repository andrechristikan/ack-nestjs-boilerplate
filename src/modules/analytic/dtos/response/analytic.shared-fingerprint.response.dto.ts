import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one device fingerprint shared by several users.
 * @public
 */
export const AnalyticSharedFingerprintResponseSchema = z.object({
    fingerprint: z.string().meta({
        description: 'Device fingerprint the users share',
        example: faker.string.alphanumeric(32),
    }),
    userCount: z.number().meta({
        description: 'Number of users sharing the fingerprint',
        example: faker.number.int({ min: 0, max: 100 }),
    }),
    userIds: z.array(z.string()).meta({
        description: 'Identifiers of the users sharing the fingerprint',
        example: [faker.string.uuid(), faker.string.uuid()],
    }),
});

/**
 * One device fingerprint shared by several users.
 * @public
 */
export type AnalyticSharedFingerprintResponseDto = z.infer<
    typeof AnalyticSharedFingerprintResponseSchema
>;
