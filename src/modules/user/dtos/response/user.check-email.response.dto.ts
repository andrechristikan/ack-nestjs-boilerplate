import { z } from 'zod';

/** @public */
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

/** @public */
export type UserCheckEmailResponseDto = z.infer<
    typeof UserCheckEmailResponseSchema
>;
