import { z } from 'zod';
import { EnumTermPolicyType } from '@generated/prisma-client';

export const TermPolicyAcceptRequestSchema = z.strictObject({
    type: z.enum(EnumTermPolicyType).meta({
        description: 'Type of the terms policy',
        example: EnumTermPolicyType.privacy,
    }),
});

export type TermPolicyAcceptRequestDto = z.infer<
    typeof TermPolicyAcceptRequestSchema
>;
