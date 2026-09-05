import { z } from 'zod';

/**
 * Outcome of checking an email against the blocklist and the existing accounts.
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

export type UserCheckEmailResponseDto = z.infer<
    typeof UserCheckEmailResponseSchema
>;

export const UserCheckUsernameResponseSchema =
    UserCheckEmailResponseSchema.extend({
        pattern: z.boolean().meta({
            description: 'Whether the username matches the allowed pattern',
            example: true,
        }),
    });

export type UserCheckUsernameResponseDto = z.infer<
    typeof UserCheckUsernameResponseSchema
>;
