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

    it('parses a null name to clear it', () => {
        const result = UserUpdateProfileRequestSchema.parse({
            ...payload,
            name: null,
        });

        expect(result).toEqual({ ...payload, name: null });
    });

    it('rejects a body missing the name', () => {
        expect(() =>
            UserUpdateProfileRequestSchema.parse({
                countryId: payload.countryId,
                gender: payload.gender,
            })
        ).toThrow();
    });

    it('rejects a body missing the country', () => {
        expect(() =>
            UserUpdateProfileRequestSchema.parse({
                name: payload.name,
                gender: payload.gender,
            })
        ).toThrow();
    });

    it('rejects a body missing the gender', () => {
        expect(() =>
            UserUpdateProfileRequestSchema.parse({
                name: payload.name,
                countryId: payload.countryId,
            })
        ).toThrow();
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
