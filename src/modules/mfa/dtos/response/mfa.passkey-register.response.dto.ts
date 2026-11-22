import { z } from 'zod';
import { MfaBackupCodesResponseSchema } from '@modules/mfa/dtos/response/mfa.backup-codes.response.dto';
import { MfaPasskeyResponseSchema } from '@modules/mfa/dtos/response/mfa.passkey.response.dto';

/** @public */
export const MfaPasskeyRegisterResponseSchema =
    MfaBackupCodesResponseSchema.extend({
        passkey: MfaPasskeyResponseSchema.meta({
            description: 'The registered passkey',
        }),
    });

/** @public */
export type MfaPasskeyRegisterResponseDto = z.infer<
    typeof MfaPasskeyRegisterResponseSchema
>;
