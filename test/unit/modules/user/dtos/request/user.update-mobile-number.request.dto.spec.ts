import { UserUpdateMobileNumberRequestSchema } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';

describe('UserUpdateMobileNumberRequestSchema', () => {
    const payload = {
        countryId: '507f1f77bcf86cd799439012',
        number: '81234567890',
        phoneCode: '62',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserUpdateMobileNumberRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserUpdateMobileNumberRequestSchema.parse({
                ...payload,
                username: 'johnSmith123',
            })
        ).toThrow();
    });
});
