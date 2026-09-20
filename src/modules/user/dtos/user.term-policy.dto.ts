import { z } from 'zod';
import { EnumTermPolicyType } from '@generated/prisma-client/client';

/**
 * Shapes the acceptance flag of each term policy type for a user.
 * @public
 */
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

/**
 * Acceptance flag per term policy type for a user.
 * @public
 */
export type UserTermPolicyDto = z.infer<typeof UserTermPolicySchema>;
