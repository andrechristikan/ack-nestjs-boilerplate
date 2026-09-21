import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Shapes the policy list returned by the policy list routes.
 * @public
 */
export const PolicyListResponseSchema = z.object({
    policies: z.array(PolicySchema).meta({
        description: 'Policies granted by the role',
        default: [],
        example: [],
    }),
});

/**
 * Policy list.
 * @public
 */
export type PolicyListResponseDto = z.infer<typeof PolicyListResponseSchema>;
