import { z } from 'zod';
import { EnumTermPolicyType } from '@generated/prisma-client';

export const UserTermPolicySchema = z.object({
    [EnumTermPolicyType.termsOfService]: z.boolean().meta({
        description: 'Terms of Service acceptance',
        example: true,
    }),
    [EnumTermPolicyType.privacy]: z.boolean().meta({
        description: 'Privacy Policy acceptance',
        example: true,
    }),
    [EnumTermPolicyType.cookies]: z.boolean().meta({
        description: 'Cookie Policy acceptance',
        example: true,
    }),
    [EnumTermPolicyType.marketing]: z.boolean().meta({
        description: 'Marketing Policy acceptance',
        example: false,
    }),
});

export type UserTermPolicyDto = z.infer<typeof UserTermPolicySchema>;
