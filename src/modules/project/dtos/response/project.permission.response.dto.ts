import { z } from 'zod';
import { PolicyEffectivePermissionResponseSchema } from '@modules/policy/dtos/response/policy.effective-permission.response.dto';

/** @public */
export const ProjectPermissionResponseSchema = z.object({
    permissions: z.array(PolicyEffectivePermissionResponseSchema).meta({
        description:
            'Actions the caller holds on each project subject; a subject with none is omitted',
        example: [],
    }),
});

/** @public */
export type ProjectPermissionResponseDto = z.infer<
    typeof ProjectPermissionResponseSchema
>;
