import { z } from 'zod';
import {
    EnumPolicyConditionPlaceholder,
    isPolicyPlaceholder,
} from '@modules/policy/constants/policy.constant';
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
            .record(
                z.string(),
                z.union([z.string(), z.number(), z.boolean(), z.null()])
            )
            .refine(
                conditions =>
                    Object.values(conditions).every(
                        value =>
                            !isPolicyPlaceholder(value) ||
                            Object.values<string>(
                                EnumPolicyConditionPlaceholder
                            ).includes(value)
                    ),
                { message: 'Unknown condition placeholder' }
            )
            .meta({
                description:
                    'Flat scalar field conditions the rule applies to, or a known ${...} placeholder as a value; absent for the whole subject',
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
