import { UserVerifyMobileNumberRequestSchema } from '@modules/user/dtos/request/user.verify-mobile-number.request.dto';

describe('UserVerifyMobileNumberRequestSchema', () => {
    const payload = { otp: '482913' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserVerifyMobileNumberRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty code and a code with a non-digit', () => {
        const result = UserVerifyMobileNumberRequestSchema.safeParse({
            otp: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['otp'], code: 'too_small' }),
            expect.objectContaining({ path: ['otp'], code: 'invalid_format' }),
        ]);

        const result2 = UserVerifyMobileNumberRequestSchema.safeParse({
            otp: '48291a',
        });

        expect(result2.error?.issues).toEqual([
            expect.objectContaining({ path: ['otp'], code: 'invalid_format' }),
        ]);
    });

    it('accepts a code of 32 digits and rejects one of 33', () => {
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({ otp: '1'.repeat(32) })
        ).not.toThrow();
        const result = UserVerifyMobileNumberRequestSchema.safeParse({
            otp: '1'.repeat(33),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['otp'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserVerifyMobileNumberRequestSchema.safeParse({
            ...payload,
            mobileNumberId: 'mobile-flint',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
