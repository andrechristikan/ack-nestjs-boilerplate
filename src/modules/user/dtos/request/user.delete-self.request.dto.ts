import { z } from 'zod';

/** @public */
export const UserDeleteSelfRequestSchema = z.strictObject({
    password: z.string().min(1).meta({
        description: 'current string password',
        example: 'Current-pass1',
    }),
});

/** @public */
export type UserDeleteSelfRequestDto = z.infer<
    typeof UserDeleteSelfRequestSchema
>;
