import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

/**
 * Validates the body for inviting an email to the workspace.
 * @public
 */
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
    workspaceRoleId: RequestUuidSchema.meta({
        description:
            'Id of the workspace role granted once the invite is accepted, taken from the shared role list with scope workspace; the owner role is never assignable through an invite',
        example: faker.string.uuid(),
    }),
    projectId: RequestUuidSchema.optional().meta({
        description:
            'Project to also join; must belong to the current workspace. Requires projectRoleId',
        example: faker.string.uuid(),
    }),
    projectRoleId: RequestUuidSchema.optional().meta({
        description:
            'Id of the project role granted on accept, taken from the shared role list with scope project; required when projectId is set, otherwise omitted',
        example: faker.string.uuid(),
    }),
    expiryDuration: z.enum(EnumWorkspaceInviteExpiry).optional().meta({
        description:
            'Invite expiry duration in days; omitted falls back to the configured default (currently 7 days)',
        example: EnumWorkspaceInviteExpiry.sevenDays,
    }),
});

/**
 * Body for inviting an email to the workspace.
 * @public
 */
export type WorkspaceInviteCreateRequestDto = z.infer<
    typeof WorkspaceInviteCreateRequestSchema
>;
