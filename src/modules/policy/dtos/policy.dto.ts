import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

/** @public */
export const PolicySchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    subject: z.enum(EnumPolicySubject).meta({
        description: 'Policy subject',
        example: EnumPolicySubject.user,
    }),
    action: z
        .array(z.enum(EnumPolicyAction))
        .min(1)
        .max(Object.values(EnumPolicyAction).length)
        .meta({
            description:
                'Policy action base on subject, at most one per policy action',
            default: [EnumPolicyAction.manage],
            example: [EnumPolicyAction.manage],
        }),
});

/** @public */
export type PolicyDto = z.infer<typeof PolicySchema>;
