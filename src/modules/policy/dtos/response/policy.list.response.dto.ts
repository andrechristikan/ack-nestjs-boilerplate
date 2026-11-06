import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/** @public */
export const PolicyListResponseSchema = z.object({
    policies: z.array(PolicySchema).meta({
        description: 'Policies granted by the role',
        default: [],
        example: [],
    }),
});

/** @public */
export type PolicyListResponseDto = z.infer<typeof PolicyListResponseSchema>;
