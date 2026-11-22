import { z } from 'zod';

/** @public */
export const MfaPasskeyUpdateRequestSchema = z.strictObject({
    name: z.string().trim().min(1).max(50).meta({
        description: 'Name of the passkey, at most 50 characters',
        example: 'Laptop',
    }),
});

/** @public */
export type MfaPasskeyUpdateRequestDto = z.infer<
    typeof MfaPasskeyUpdateRequestSchema
>;
