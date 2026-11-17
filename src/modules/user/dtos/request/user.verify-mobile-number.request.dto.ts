import { z } from 'zod';

/** @public */
export const UserVerifyMobileNumberRequestSchema = z.strictObject({
    otp: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[0-9]+$/)
        .meta({
            description:
                'one-time code sent to the mobile number, digits only, at most 32 characters',
            example: '123456',
        }),
});

/** @public */
export type UserVerifyMobileNumberRequestDto = z.infer<
    typeof UserVerifyMobileNumberRequestSchema
>;
