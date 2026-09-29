import { UserAddMobileNumberRequestSchema } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';

describe('UserAddMobileNumberRequestSchema', () => {
    const payload = {
        countryId: '507f1f77bcf86cd799439012',
        number: '81234567890',
        phoneCode: '62',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserAddMobileNumberRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a number shorter than 8 characters', () => {
        expect(() =>
            UserAddMobileNumberRequestSchema.parse({
                ...payload,
                number: '123',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserAddMobileNumberRequestSchema.parse({
                ...payload,
                username: 'johnSmith123',
            })
        ).toThrow();
    });
});
