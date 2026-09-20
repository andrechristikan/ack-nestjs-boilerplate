import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Validates the body for claiming a workspace invite.
 * @public
 */
export const WorkspaceInviteClaimRequestSchema = z.strictObject({
    inviteToken: z
        .string()
        .min(1)
        .meta({
            description:
                'Plain workspace invite token received in the invite email link',
            example: faker.string.alphanumeric(100),
        }),
});

/**
 * Body for claiming a workspace invite.
 * @public
 */
export type WorkspaceInviteClaimRequestDto = z.infer<
    typeof WorkspaceInviteClaimRequestSchema
>;
