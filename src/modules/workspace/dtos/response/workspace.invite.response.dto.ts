import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumRoleScope,
    EnumWorkspaceInviteStatus,
} from '@generated/prisma-client/client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { RoleRefResponseSchema } from '@modules/role/dtos/response/role.ref.response.dto';

/**
 * Base workspace-invite shape: the stored invite row, without the hashed token.
 * @public
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
    workspaceRole: RoleRefResponseSchema.meta({
        description: 'Workspace role granted when the invite is accepted',
        example: {
            id: faker.string.uuid(),
            scope: EnumRoleScope.workspace,
            key: EnumRoleWorkspaceKey.member,
            name: 'Member',
        },
    }),
    projectId: z.string().nullable().meta({
        description: 'Identifier of the project the invite also grants, if any',
        example: faker.string.uuid(),
    }),
    projectRole: RoleRefResponseSchema.nullable().meta({
        description: 'Project role granted when the invite is accepted, if any',
        example: {
            id: faker.string.uuid(),
            scope: EnumRoleScope.project,
            key: EnumRoleProjectKey.member,
            name: 'Member',
        },
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
    invitedByUserId: z.string().nullable().meta({
        description:
            'Identifier of the user who sent the invite; null once that user is deleted',
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

/**
 * Stored workspace invite without the hashed token.
 * @public
 */
export type WorkspaceInviteResponseDto = z.infer<
    typeof WorkspaceInviteResponseSchema
>;
