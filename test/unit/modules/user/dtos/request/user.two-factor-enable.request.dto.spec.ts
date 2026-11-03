import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

describe('UserTwoFactorEnableRequestSchema', () => {
    const payload = { code: '654321', password: 'Current-pass1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserTwoFactorEnableRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a code with a non-digit character', () => {
        expect(() =>
            UserTwoFactorEnableRequestSchema.parse({
                ...payload,
                code: 'abc123',
            })
        ).toThrow();
    });

    it('rejects a payload without the current password', () => {
        expect(() =>
            UserTwoFactorEnableRequestSchema.parse({ code: '654321' })
        ).toThrow();
    });

    it('rejects an empty current password', () => {
        expect(() =>
            UserTwoFactorEnableRequestSchema.parse({
                ...payload,
                password: '',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserTwoFactorEnableRequestSchema.parse({
                ...payload,
                backupCode: 'ABCD1234EF',
            })
        ).toThrow();
    });
});
