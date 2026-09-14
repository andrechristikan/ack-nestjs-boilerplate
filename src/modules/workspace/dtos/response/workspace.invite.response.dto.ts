import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';

/**
 * Base workspace-invite shape: the stored invite row, without the hashed token.
 */
export const WorkspaceInviteResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    workspaceId: z.string().meta({
        description: 'Identifier of the workspace the invite belongs to',
        example: faker.string.uuid(),
    }),
    email: z.string().meta({
        description: 'Email address the invite is sent to',
        example: faker.internet.email(),
    }),
    workspaceRole: z.enum(EnumWorkspaceMemberRole).meta({
        description: 'Workspace role granted when the invite is accepted',
        example: EnumWorkspaceMemberRole.member,
    }),
    projectId: z.string().nullable().meta({
        description: 'Identifier of the project the invite also grants, if any',
        example: faker.string.uuid(),
    }),
    projectRole: z.enum(EnumProjectMemberRole).nullable().meta({
        description: 'Project role granted when the invite is accepted, if any',
        example: EnumProjectMemberRole.member,
    }),
    reference: z.string().meta({
        description: 'Human-readable reference of the invite',
        example: 'WIN-abc123',
    }),
    expiredAt: z.date().meta({
        description: 'When the invite expires',
        example: faker.date.future(),
    }),
    status: z.enum(EnumWorkspaceInviteStatus).meta({
        description: 'Current status of the invite',
        example: EnumWorkspaceInviteStatus.pending,
    }),
    invitedByUserId: z.string().meta({
        description: 'Identifier of the user who sent the invite',
        example: faker.string.uuid(),
    }),
    acceptedAt: z.date().nullable().meta({
        description: 'When the invite was accepted',
        example: faker.date.recent(),
    }),
    acceptedByUserId: z.string().nullable().meta({
        description: 'Identifier of the user who accepted the invite',
        example: faker.string.uuid(),
    }),
});

export type WorkspaceInviteResponseDto = z.infer<
    typeof WorkspaceInviteResponseSchema
>;
