import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Validates the body for previewing a workspace invite.
 * @public
 */
export const WorkspaceInvitePreviewRequestSchema = z.strictObject({
    inviteToken: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .meta({
            description:
                'Plain workspace invite token received in the invite email link',
            example: faker.string.alphanumeric(100),
        }),
});

/**
 * Body for previewing a workspace invite.
 * @public
 */
export type WorkspaceInvitePreviewRequestDto = z.infer<
    typeof WorkspaceInvitePreviewRequestSchema
>;
