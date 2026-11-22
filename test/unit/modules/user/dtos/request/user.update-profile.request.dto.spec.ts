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
        const result = UserUpdateProfileRequestSchema.safeParse({
            countryId: payload.countryId,
            gender: payload.gender,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a body missing the country', () => {
        const result = UserUpdateProfileRequestSchema.safeParse({
            name: payload.name,
            gender: payload.gender,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['countryId'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a body missing the gender', () => {
        const result = UserUpdateProfileRequestSchema.safeParse({
            name: payload.name,
            countryId: payload.countryId,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['gender'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a gender outside EnumUserGender', () => {
        const result = UserUpdateProfileRequestSchema.safeParse({
            ...payload,
            gender: 'unknownGender',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['gender'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserUpdateProfileRequestSchema.safeParse({
            ...payload,
            email: 'john.doe@example.com',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('trims the name and rejects a whitespace-only name', () => {
        expect(
            UserUpdateProfileRequestSchema.parse({
                ...payload,
                name: '  John  ',
            }).name
        ).toBe('John');
        expect(
            UserUpdateProfileRequestSchema.safeParse({
                ...payload,
                name: '   ',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });
});
