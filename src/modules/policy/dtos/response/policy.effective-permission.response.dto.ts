import { z } from 'zod';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

/** @public */
export const PolicyEffectivePermissionResponseSchema = z.object({
    subject: z.enum(EnumPolicySubject).meta({
        description: 'Policy subject',
        example: EnumPolicySubject.Workspace,
    }),
    actions: z.array(z.enum(EnumPolicyAction)).meta({
        description: 'Concrete actions the caller holds on the subject',
        example: [EnumPolicyAction.read],
    }),
});

/** @public */
export type PolicyEffectivePermissionResponseDto = z.infer<
    typeof PolicyEffectivePermissionResponseSchema
>;
