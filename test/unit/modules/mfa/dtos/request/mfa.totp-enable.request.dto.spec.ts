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
        const result = MfaTotpEnableRequestSchema.safeParse({
            password: 'Current-pass1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['code'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a code with a non-digit character', () => {
        const result = MfaTotpEnableRequestSchema.safeParse({
            ...payload,
            code: 'abc123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['code'], code: 'invalid_format' }),
        ]);
    });

    it('accepts a payload without password', () => {
        const result = MfaTotpEnableRequestSchema.parse({
            code: '654321',
        });

        expect(result).toEqual({ code: '654321' });
    });

    it('rejects an empty current password', () => {
        const result = MfaTotpEnableRequestSchema.safeParse({
            ...payload,
            password: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['password'], code: 'too_small' }),
        ]);
    });

    it('keeps an optional backup code', () => {
        const result = MfaTotpEnableRequestSchema.parse({
            ...payload,
            backupCode: 'ABCD1234EF',
        });

        expect(result).toMatchObject({ backupCode: 'ABCD1234EF' });
    });

    it('rejects the discarded method field', () => {
        const result = MfaTotpEnableRequestSchema.safeParse({
            ...payload,
            method: 'code',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = MfaTotpEnableRequestSchema.safeParse({
            ...payload,
            username: 'johnSmith123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a code of 32 characters and rejects one of 33', () => {
        expect(() =>
            MfaTotpEnableRequestSchema.parse({
                ...payload,
                code: '1'.repeat(32),
            })
        ).not.toThrow();
        const result = MfaTotpEnableRequestSchema.safeParse({
            ...payload,
            code: '1'.repeat(33),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['code'], code: 'too_big' }),
        ]);
    });
});
