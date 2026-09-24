import { UserTwoFactorRegenerateBackupCodeRequestSchema } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';

describe('UserTwoFactorRegenerateBackupCodeRequestSchema', () => {
    it('accepts a numeric authenticator code', () => {
        expect(
            UserTwoFactorRegenerateBackupCodeRequestSchema.parse({
                code: '123456',
            })
        ).toEqual({ code: '123456' });
    });

    it.each([
        { code: '' },
        { code: 'ABCDEF' },
        { code: '123456', unknown: true },
    ])('rejects malformed or unknown input', input => {
        expect(
            UserTwoFactorRegenerateBackupCodeRequestSchema.safeParse(input)
                .success
        ).toBe(false);
    });
});
