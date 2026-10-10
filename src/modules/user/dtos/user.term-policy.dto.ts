import { z } from 'zod';

/**
 * Shapes the acceptance flag column of each term policy type on a user row.
 * @public
 */
export const UserTermPolicySchema = z.object({
    termsOfServiceAccepted: z.boolean().meta({
        description: 'Terms of Service acceptance',
        example: true,
    }),
    privacyAccepted: z.boolean().meta({
        description: 'Privacy Policy acceptance',
        example: true,
    }),
    cookiesAccepted: z.boolean().meta({
        description: 'Cookie Policy acceptance',
        example: true,
    }),
    marketingAccepted: z.boolean().meta({
        description: 'Marketing Policy acceptance',
        example: false,
    }),
});

/**
 * Acceptance flag columns of a user row.
 * @public
 */
export type UserTermPolicyDto = z.infer<typeof UserTermPolicySchema>;
