import { UserVerifyMobileNumberRequestSchema } from '@modules/user/dtos/request/user.verify-mobile-number.request.dto';

describe('UserVerifyMobileNumberRequestSchema', () => {
    const payload = { otp: '482913' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserVerifyMobileNumberRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty code and a code with a non-digit', () => {
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({ otp: '' })
        ).toThrow();
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({ otp: '48291a' })
        ).toThrow();
    });

    it('accepts a code of 32 digits and rejects one of 33', () => {
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({ otp: '1'.repeat(32) })
        ).not.toThrow();
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({ otp: '1'.repeat(33) })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({
                ...payload,
                mobileNumberId: 'mobile-flint',
            })
        ).toThrow();
    });
});
