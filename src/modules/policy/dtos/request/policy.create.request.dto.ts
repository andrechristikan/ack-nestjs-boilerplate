import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Request shape naming one rule: subject, actions and optional conditions and inversion.
 * @public
 */
export const PolicyCreateRequestSchema = PolicySchema.pick({
    subject: true,
    action: true,
    inverted: true,
})
    .partial({ inverted: true })
    .extend({
        conditions: z
            .record(z.string(), z.json())
            .meta({
                description:
                    'Prisma where-input conditions the rule applies to; absent for the whole subject',
                example: { workspaceId: '${workspaceId}' },
            })
            .optional(),
        reason: PolicySchema.shape.reason.unwrap().optional(),
    })
    .strict();

/**
 * Body granting one rule to a role.
 * @public
 */
export type PolicyCreateRequestDto = z.infer<typeof PolicyCreateRequestSchema>;
