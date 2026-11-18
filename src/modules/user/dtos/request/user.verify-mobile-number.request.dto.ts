import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Validates the body for verifying a mobile number with an otp.
 * @public
 */
export const UserVerifyMobileNumberRequestSchema = z.strictObject({
    otp: z
        .string()
        .trim()
        .regex(/^\d{4,10}$/)
        .meta({
            description: 'One-time code sent by SMS to the mobile number',
            example: faker.string.numeric(6),
        }),
});

/**
 * Body for verifying a mobile number with an otp.
 * @public
 */
export type UserVerifyMobileNumberRequestDto = z.infer<
    typeof UserVerifyMobileNumberRequestSchema
>;
