import { EnumUserGender } from '@generated/prisma-client/client';
import { UserUpdateProfileRequestSchema } from '@modules/user/dtos/request/user.update-profile.request.dto';

describe('UserUpdateProfileRequestSchema', () => {
    const valid = {
        name: 'Updated User',
        countryId: '507f1f77bcf86cd799439011',
        gender: EnumUserGender.female,
    };

    it('accepts a complete profile update', () => {
        expect(UserUpdateProfileRequestSchema.parse(valid)).toEqual(valid);
    });

    it.each([
        { ...valid, name: '' },
        { ...valid, countryId: 'invalid' },
        { ...valid, gender: 'invalid' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input => {
        expect(UserUpdateProfileRequestSchema.safeParse(input).success).toBe(
            false
        );
    });
});
