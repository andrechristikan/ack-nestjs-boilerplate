import { z } from 'zod';

/** @public */
export const MfaBackupCodesResponseSchema = z.object({
    backupCodes: z
        .array(z.string())
        .nullable()
        .meta({
            description:
                'List of newly generated backup codes, null when the account already holds backup codes. Each code can be used once.',
            example: ['ABCD1234EF', 'ZXCV5678GH'],
        }),
});

/** @public */
export type MfaBackupCodesResponseDto = z.infer<
    typeof MfaBackupCodesResponseSchema
>;
