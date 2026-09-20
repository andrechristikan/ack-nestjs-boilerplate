import { z } from 'zod';

/**
 * Outcome of checking an email against the blocklist and the existing accounts.
 * @public
 */
export const UserCheckEmailResponseSchema = z.object({
    badWord: z.boolean().meta({
        description: 'Whether the value contains a blocked word',
        example: false,
    }),
    exist: z.boolean().meta({
        description: 'Whether the value already exists',
        example: false,
    }),
});

/**
 * Email check outcome.
 * @public
 */
export type UserCheckEmailResponseDto = z.infer<
    typeof UserCheckEmailResponseSchema
>;
