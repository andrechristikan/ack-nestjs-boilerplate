import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

export const WorkspaceInviteCreateRequestSchema = z.strictObject({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .superRefine((value, ctx) => {
            const validation = validateEmail(value);
            if (!validation.validated) {
                ctx.addIssue({
                    code: 'custom',
                    message: validation.messagePath,
                });
            }
        })
        .meta({
            description: 'Email of the person being invited',
            example: faker.internet.email(),
        })
        .transform(value => value as Lowercase<string>),
    workspaceRole: z
        .enum([EnumWorkspaceMemberRole.admin, EnumWorkspaceMemberRole.member])
        .meta({
            description:
                'Workspace role granted once the invite is accepted; owner can never be invited',
            example: EnumWorkspaceMemberRole.member,
        }),
    projectId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .optional()
        .meta({
            description:
                'Project to also join; must belong to the current workspace. Requires projectRole',
            example: faker.database.mongodbObjectId(),
        }),
    projectRole: z.enum(EnumProjectMemberRole).optional().meta({
        description:
            'Project role granted on accept; required when projectId is set, otherwise omitted',
        example: EnumProjectMemberRole.member,
    }),
    expiryDuration: z.enum(EnumWorkspaceInviteExpiry).optional().meta({
        description:
            'Invite expiry duration in days; omitted falls back to the configured default (currently 7 days)',
        example: EnumWorkspaceInviteExpiry.sevenDays,
    }),
});

export type WorkspaceInviteCreateRequestDto = z.infer<
    typeof WorkspaceInviteCreateRequestSchema
>;
