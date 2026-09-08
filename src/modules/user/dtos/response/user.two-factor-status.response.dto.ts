import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Current two-factor authentication state of the signed-in account.
 */
export const UserTwoFactorStatusResponseSchema = z.object({
    isEnabled: z.boolean().meta({
        description:
            'Whether two-factor authentication is enabled for the account',
        example: false,
    }),
    isPendingConfirmation: z.boolean().meta({
        description:
            'True when 2FA setup has been started but not yet confirmed',
        example: false,
    }),
    backupCodesRemaining: z.number().min(0).meta({
        description: 'Remaining backup codes count for the account',
        example: 8,
    }),
    confirmedAt: z.date().nullable().meta({
        description: 'When two-factor authentication was confirmed/enabled',
        example: faker.date.past(),
    }),
    lastUsedAt: z.date().nullable().meta({
        description: 'Last time two-factor authentication was used/verified',
        example: faker.date.recent(),
    }),
});

export type UserTwoFactorStatusResponseDto = z.infer<
    typeof UserTwoFactorStatusResponseSchema
>;
