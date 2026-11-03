import { UserTwoFactorSetupRequestSchema } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';

describe('UserTwoFactorSetupRequestSchema', () => {
    const payload = { password: 'Current-pass1', backupCode: 'ABCD1234EF' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserTwoFactorSetupRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload without a backup code', () => {
        const result = UserTwoFactorSetupRequestSchema.parse({
            password: 'Current-pass1',
        });

        expect(result).toEqual({ password: 'Current-pass1' });
    });

    it('rejects a payload without the current password', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({ backupCode: 'ABCD1234EF' })
        ).toThrow();
    });

    it('rejects an empty current password', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('rejects a missing body', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse(undefined)
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserTwoFactorSetupRequestSchema.parse({
                ...payload,
                code: '654321',
            })
        ).toThrow();
    });
});
