import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RoleRefResponseSchema } from '@modules/role/dtos/response/role.ref.response.dto';

/** @public */
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
    }),
    expiredAt: z.date().meta({
        description: 'When the invite expires',
        example: faker.date.future(),
    }),
});

/** @public */
export type WorkspaceInvitePreviewResponseDto = z.infer<
    typeof WorkspaceInvitePreviewResponseSchema
>;
