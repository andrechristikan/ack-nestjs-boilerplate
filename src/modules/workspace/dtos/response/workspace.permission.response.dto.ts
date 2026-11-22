import { z } from 'zod';
import { EnumPolicySubject } from '@generated/prisma-client/client';
import { EffectivePermissionSchema } from '@modules/policy/dtos/response/policy.effective-permission.response.dto';

/**
 * The caller's effective permissions for the current workspace.
 * @public
 */
export const WorkspacePermissionResponseSchema = z.object({
    permissions: z
        .array(
            EffectivePermissionSchema.extend({
                subject: z.literal(EnumPolicySubject.Workspace),
            })
        )
        .meta({
            description: 'Effective permissions for the current workspace',
        }),
});

/**
 * Effective permissions for the current workspace.
 * @public
 */
export type WorkspacePermissionResponseDto = z.infer<
    typeof WorkspacePermissionResponseSchema
>;
