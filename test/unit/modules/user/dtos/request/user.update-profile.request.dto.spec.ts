import { EnumUserGender } from '@generated/prisma-client/client';
import { UserUpdateProfileRequestSchema } from '@modules/user/dtos/request/user.update-profile.request.dto';

describe('UserUpdateProfileRequestSchema', () => {
    const payload = {
        name: 'John Doe',
        countryId: '507f1f77bcf86cd799439012',
        gender: EnumUserGender.male,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserUpdateProfileRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a gender outside EnumUserGender', () => {
        expect(() =>
            UserUpdateProfileRequestSchema.parse({
                ...payload,
                gender: 'unknownGender',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserUpdateProfileRequestSchema.parse({
                ...payload,
                email: 'john.doe@example.com',
            })
        ).toThrow();
    });
});
