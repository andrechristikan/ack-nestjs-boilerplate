import { z } from 'zod';
import { PolicyEffectivePermissionResponseSchema } from '@modules/policy/dtos/response/policy.effective-permission.response.dto';

/** @public */
export const WorkspacePermissionResponseSchema = z.object({
    permissions: z.array(PolicyEffectivePermissionResponseSchema).meta({
        description:
            'Actions the caller holds on each workspace subject; a subject with none is omitted',
        example: [],
    }),
});

/** @public */
export type WorkspacePermissionResponseDto = z.infer<
    typeof WorkspacePermissionResponseSchema
>;
