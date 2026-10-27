import { z } from 'zod';
import type { Prisma } from '@generated/prisma-client/client';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(JsonValueSchema),
        z.record(z.string(), JsonValueSchema),
    ])
);

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
            .record(z.string(), JsonValueSchema)
            .meta({
                type: 'object',
                description:
                    'CASL Prisma where-input conditions; nested and relation filters allowed; ${userId} / ${workspaceId} / ${projectId} whole-value placeholders',
                example: {
                    workspaceId: '${workspaceId}',
                    members: { some: { userId: '${userId}' } },
                },
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
