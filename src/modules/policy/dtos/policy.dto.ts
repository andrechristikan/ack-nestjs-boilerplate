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
        .meta({
            description: 'Policy action base on subject',
            default: [EnumPolicyAction.manage],
            example: [EnumPolicyAction.manage],
        }),
});

/** @public */
export type PolicyDto = z.infer<typeof PolicySchema>;
