import { z } from 'zod';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

/**
 * Request shape naming one ordered rule: subject, actions and priority, with optional
 * conditions, inversion and reason.
 * @public
 */
export const PolicyCreateRequestSchema = PolicySchema.pick({
    subject: true,
    action: true,
    priority: true,
    inverted: true,
})
    .partial({ inverted: true })
    .extend({
        conditions: z
            .record(z.string(), z.json())
            .meta({
                description:
                    'Prisma where-input conditions the rule applies to; absent for the whole subject',
                example: { workspaceId: '${workspace.id}' },
            })
            .optional(),
        reason: PolicySchema.shape.reason.unwrap().optional(),
    })
    .strict();

/**
 * Body granting one ordered rule to a role.
 * @public
 */
export type PolicyCreateRequestDto = z.infer<typeof PolicyCreateRequestSchema>;
