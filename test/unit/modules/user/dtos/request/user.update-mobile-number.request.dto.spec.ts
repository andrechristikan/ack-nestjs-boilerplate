import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
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

    it('parses the re-authentication fields beside the number', () => {
        const full = {
            ...payload,
            password: 'Current-pass1',
            method: EnumAuthTwoFactorMethod.code,
            code: '654321',
            backupCode: 'ABCD1234EF',
            otp: '123456',
        };

        const result = UserUpdateMobileNumberRequestSchema.parse(full);

        expect(result).toEqual(full);
    });

    it('rejects a number shorter than 8 characters', () => {
        expect(() =>
            UserUpdateMobileNumberRequestSchema.parse({
                ...payload,
                number: '123',
            })
        ).toThrow();
    });

    it('rejects a number with a non-digit character', () => {
        expect(() =>
            UserUpdateMobileNumberRequestSchema.parse({
                ...payload,
                number: 'abcdefgh',
            })
        ).toThrow();
    });

    it('rejects a phone code with a non-digit character', () => {
        expect(() =>
            UserUpdateMobileNumberRequestSchema.parse({
                ...payload,
                phoneCode: '+62',
            })
        ).toThrow();
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserUpdateMobileNumberRequestSchema.parse({
                ...payload,
                password: '',
            })
        ).toThrow();
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
