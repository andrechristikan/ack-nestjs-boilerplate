import { MfaTotpEnableRequestSchema } from '@modules/mfa/dtos/request/mfa.totp-enable.request.dto';

describe('MfaTotpEnableRequestSchema', () => {
    const payload = { code: '654321', password: 'Current-pass1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = MfaTotpEnableRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses the password and email code beside the code', () => {
        const full = { ...payload, otp: '123456' };

        const result = MfaTotpEnableRequestSchema.parse(full);

        expect(result).toEqual(full);
    });

    it('rejects a payload without the code of the new authenticator', () => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                password: 'Current-pass1',
            })
        ).toThrow();
    });

    it('rejects a code with a non-digit character', () => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                code: 'abc123',
            })
        ).toThrow();
    });

    it('accepts a payload without password', () => {
        const result = MfaTotpEnableRequestSchema.parse({
            code: '654321',
        });

        expect(result).toEqual({ code: '654321' });
    });

    it('rejects an empty current password', () => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                password: '',
            })
        ).toThrow();
    });

    it.each([
        ['method', 'code'],
        ['backupCode', 'ABCD1234EF'],
    ])('rejects the discarded %s field', (key, value) => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                [key]: value,
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                username: 'johnSmith123',
            })
        ).toThrow();
    });

    it('accepts a code of 32 characters and rejects one of 33', () => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                code: '1'.repeat(32),
            })
        ).not.toThrow();
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                code: '1'.repeat(33),
            })
        ).toThrow();
    });
});
