import { z } from 'zod';

/** @public */
export const MfaPasskeyUpdateRequestSchema = z.strictObject({
    name: z.string().trim().toLowerCase().min(1).max(50).meta({
        description: 'Name of the passkey, at most 50 characters',
        example: 'laptop',
    }),
});

/** @public */
export type MfaPasskeyUpdateRequestDto = z.infer<
    typeof MfaPasskeyUpdateRequestSchema
>;
