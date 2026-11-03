import { z } from 'zod';

/**
 * Validates the body for deleting the signed-in account.
 * @public
 */
export const UserDeleteSelfRequestSchema = z.strictObject({
    password: z.string().min(1).meta({
        description: 'current string password',
        example: 'Current-pass1',
    }),
});

/**
 * Body for deleting the signed-in account.
 * @public
 */
export type UserDeleteSelfRequestDto = z.infer<
    typeof UserDeleteSelfRequestSchema
>;
