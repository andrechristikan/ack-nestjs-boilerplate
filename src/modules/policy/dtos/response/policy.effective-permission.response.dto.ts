import { z } from 'zod';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

/**
 * One row of the caller's effective permissions: a subject and the concrete actions the resolved
 * ability grants on it.
 * @public
 */
export const EffectivePermissionSchema = z.object({
    subject: z.enum(EnumPolicySubject).meta({
        description: 'Policy subject',
        example: EnumPolicySubject.Workspace,
    }),
    actions: z.array(z.enum(EnumPolicyAction)).meta({
        description: 'Actions the caller holds on this subject',
        example: [EnumPolicyAction.read, EnumPolicyAction.update],
    }),
});

/**
 * Effective permission row: a subject and the caller's granted actions on it.
 * @public
 */
export type EffectivePermissionDto = z.infer<typeof EffectivePermissionSchema>;
