import { z } from 'zod';

export const UserClaimUsernameRequestSchema = z.strictObject({
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9]+$/)
        .meta({
            description: 'username to claim',
            example: 'john_doe123',
        })
        .transform(value => value as Lowercase<string>),
});

export type UserClaimUsernameRequestDto = z.infer<
    typeof UserClaimUsernameRequestSchema
>;
