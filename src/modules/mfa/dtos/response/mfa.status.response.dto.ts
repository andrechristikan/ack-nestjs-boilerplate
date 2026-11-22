import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { MfaPasskeyResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey.response.dto';

/** @public */
export const MfaStatusResponseSchema = z.object({
    isEnabled: z.boolean().meta({
        description:
            'Whether multi-factor authentication is enabled for the account, through a confirmed authenticator app or any passkey',
        example: false,
    }),
    backupCodesRemaining: z.number().min(0).meta({
        description: 'Remaining backup codes count for the account',
        example: 8,
    }),
    totp: z
        .object({
            isEnabled: z.boolean().meta({
                description: 'Whether an authenticator app is confirmed',
                example: false,
            }),
            isPendingConfirmation: z.boolean().meta({
                description:
                    'True when authenticator app setup has been started but not yet confirmed',
                example: false,
            }),
            confirmedAt: z.date().nullable().meta({
                description: 'When the authenticator app was confirmed',
                example: faker.date.past(),
            }),
            lastUsedAt: z.date().nullable().meta({
                description: 'Last time the authenticator app was used',
                example: faker.date.recent(),
            }),
        })
        .meta({ description: 'Authenticator app state' }),
    passkeys: z.array(MfaPasskeyResponseSchema).meta({
        description: 'Registered passkeys, empty without one',
    }),
});

/** @public */
export type MfaStatusResponseDto = z.infer<typeof MfaStatusResponseSchema>;
