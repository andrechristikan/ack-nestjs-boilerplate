import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
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

    it('parses the re-authentication fields beside the number', () => {
        const full = {
            ...payload,
            password: 'Current-pass1',
            method: EnumMfaMethod.totp,
            code: '654321',
            backupCode: 'ABCD1234EF',
            otp: '123456',
        };

        const result = UserAddMobileNumberRequestSchema.parse(full);

        expect(result).toEqual(full);
    });

    it('rejects a number shorter than 8 characters', () => {
        const result = UserAddMobileNumberRequestSchema.safeParse({
            ...payload,
            number: '123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['number'], code: 'too_small' }),
        ]);
    });

    it('rejects a number with a non-digit character', () => {
        const result = UserAddMobileNumberRequestSchema.safeParse({
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
        const result = UserAddMobileNumberRequestSchema.safeParse({
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
        const result = UserAddMobileNumberRequestSchema.safeParse({
            ...payload,
            password: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['password'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserAddMobileNumberRequestSchema.safeParse({
            ...payload,
            username: 'johnSmith123',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
