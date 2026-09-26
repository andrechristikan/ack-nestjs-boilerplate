import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleRefResponseSchema } from '@modules/role/dtos/response/role.ref.response.dto';

/**
 * Safe, minimal invite preview for an unauthenticated accept-page — never the token or an
 * internal id.
 * @public
 */
export const WorkspaceInvitePreviewResponseSchema = z.object({
    workspaceName: z.string().meta({
        description: 'Name of the workspace the invite is for',
        example: 'Acme',
    }),
    inviterName: z.string().meta({
        description: 'Display name of the person who sent the invite',
        example: faker.person.fullName(),
    }),
    workspaceRole: RoleRefResponseSchema.meta({
        description: 'Workspace role the invite grants',
        example: {
            id: faker.string.uuid(),
            scope: EnumRoleScope.workspace,
            key: EnumRoleWorkspaceKey.member,
            name: 'Member',
        },
    }),
    expiredAt: z.date().meta({
        description: 'When the invite expires',
        example: faker.date.future(),
    }),
});

/**
 * Minimal workspace invite preview for the accept page.
 * @public
 */
export type WorkspaceInvitePreviewResponseDto = z.infer<
    typeof WorkspaceInvitePreviewResponseSchema
>;
