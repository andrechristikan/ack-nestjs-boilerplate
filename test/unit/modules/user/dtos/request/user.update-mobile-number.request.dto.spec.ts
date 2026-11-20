import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
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
            method: EnumMfaMethod.totp,
            code: '654321',
            backupCode: 'ABCD1234EF',
            otp: '123456',
        };

        const result = UserUpdateMobileNumberRequestSchema.parse(full);

        expect(result).toEqual(full);
    });

    it('rejects a number shorter than 8 characters', () => {
        const result = UserUpdateMobileNumberRequestSchema.safeParse({
            ...payload,
            number: '123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['number'], code: 'too_small' }),
        ]);
    });

    it('rejects a number with a non-digit character', () => {
        const result = UserUpdateMobileNumberRequestSchema.safeParse({
            ...payload,
            number: 'abcdefgh',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['number'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects a phone code with a non-digit character', () => {
        const result = UserUpdateMobileNumberRequestSchema.safeParse({
            ...payload,
            phoneCode: '+62',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['phoneCode'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects an empty password', () => {
        const result = UserUpdateMobileNumberRequestSchema.safeParse({
            ...payload,
            password: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['password'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserUpdateMobileNumberRequestSchema.safeParse({
            ...payload,
            username: 'johnSmith123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
