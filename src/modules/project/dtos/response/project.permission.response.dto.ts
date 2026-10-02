import { z } from 'zod';
import { EffectivePermissionSchema } from '@modules/policy/dtos/response/policy.effective-permission.response.dto';

/**
 * The caller's effective permissions for the current project.
 * @public
 */
export const ProjectPermissionResponseSchema = z.object({
    permissions: z.array(EffectivePermissionSchema).meta({
        description: 'Effective permissions for the current project',
    }),
});

/**
 * Effective permissions for the current project.
 * @public
 */
export type ProjectPermissionResponseDto = z.infer<
    typeof ProjectPermissionResponseSchema
>;
