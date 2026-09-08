import { z } from 'zod';
import { faker } from '@faker-js/faker';

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

export type WorkspaceInviteClaimRequestDto = z.infer<
    typeof WorkspaceInviteClaimRequestSchema
>;
