import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const WorkspaceInviteClaimRequestSchema = z.strictObject({
    inviteToken: z
        .string()
        .min(1)
        .max(200)
        .meta({
            description:
                'Plain workspace invite token received in the invite email link, at most 200 characters',
            example: faker.string.alphanumeric(100),
        }),
});

/** @public */
export type WorkspaceInviteClaimRequestDto = z.infer<
    typeof WorkspaceInviteClaimRequestSchema
>;
