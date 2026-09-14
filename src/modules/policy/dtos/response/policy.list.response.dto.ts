import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

export const PolicyListResponseSchema = z.object({
    policies: z.array(PolicySchema).meta({
        description: 'Policies granted by the role',
        default: [],
        example: [],
    }),
});

export type PolicyListResponseDto = z.infer<typeof PolicyListResponseSchema>;
