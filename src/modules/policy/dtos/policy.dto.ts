import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';

/**
 * Base policy shape: one CASL rule stored for a role.
 * @public
 */
export const PolicySchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    subject: z.enum(EnumPolicySubject).meta({
        description: 'Policy subject',
        example: EnumPolicySubject.User,
    }),
    action: z
        .array(z.enum(EnumPolicyAction))
        .min(1)
        .meta({
            description: 'Policy action base on subject',
            default: [EnumPolicyAction.manage],
            example: [EnumPolicyAction.manage],
        }),
    conditions: z
        .custom<Prisma.JsonValue>(
            value =>
                value !== null &&
                typeof value === 'object' &&
                !Array.isArray(value)
        )
        .meta({
            type: 'object',
            description:
                'Prisma where-input conditions the rule applies to, null for the whole subject',
            example: { workspaceId: '${workspaceId}' },
        })
        .nullable(),
    inverted: z.boolean().meta({
        description: 'Whether the rule denies instead of allows',
        default: false,
        example: false,
    }),
    reason: z.string().max(500).nullable().meta({
        description: 'Why an inverted rule denies',
        example: 'Owners cannot be removed',
    }),
});

/**
 * Stored policy: one rule with its subject, actions, conditions, inversion and reason.
 * @public
 */
export type PolicyDto = z.infer<typeof PolicySchema>;
