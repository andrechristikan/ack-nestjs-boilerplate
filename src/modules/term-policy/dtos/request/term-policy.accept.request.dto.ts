import { z } from 'zod';
import { EnumTermPolicyType } from '@generated/prisma-client/client';

/** @public */
export const TermPolicyAcceptRequestSchema = z.strictObject({
    type: z.enum(EnumTermPolicyType).meta({
        description: 'Type of the terms policy',
        example: EnumTermPolicyType.privacy,
    }),
});

/** @public */
export type TermPolicyAcceptRequestDto = z.infer<
    typeof TermPolicyAcceptRequestSchema
>;
