import { UserVerifyMobileNumberRequestSchema } from '@modules/user/dtos/request/user.verify-mobile-number.request.dto';

describe('UserVerifyMobileNumberRequestSchema', () => {
    const payload = { otp: '123456' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserVerifyMobileNumberRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims surrounding whitespace from the otp', () => {
        const result = UserVerifyMobileNumberRequestSchema.parse({
            otp: ' 123456 ',
        });

        expect(result).toEqual({ otp: '123456' });
    });

    it.each(['12a456', '', '12345678901', '123'])(
        'rejects otp %j that is not 4 to 10 digits',
        otp => {
            expect(() =>
                UserVerifyMobileNumberRequestSchema.parse({ otp })
            ).toThrow();
        }
    );

    it('rejects an undeclared key', () => {
        expect(() =>
            UserVerifyMobileNumberRequestSchema.parse({
                ...payload,
                mobileNumberId: '507f1f77bcf86cd799439012',
            })
        ).toThrow();
    });
});
