import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserResetPasswordGenerateMfaResponseSchema } from '@modules/user/dtos/response/user.reset-password-generate-mfa.response.dto';

describe('UserResetPasswordGenerateMfaResponseSchema', () => {
    const row = {
        methods: [EnumMfaMethod.totp, EnumMfaMethod.passkey],
        challengeToken: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
        expiresInMs: 300000,
        passkeyOptions: {
            challenge: 'challengeQuartz',
            rpId: 'example.test',
            allowCredentials: [],
            userVerification: 'required',
        },
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserResetPasswordGenerateMfaResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a row with no methods and three nulls', () => {
        const empty = {
            methods: [],
            challengeToken: null,
            expiresInMs: null,
            passkeyOptions: null,
        };

        const result = UserResetPasswordGenerateMfaResponseSchema.parse(empty);

        expect(result).toEqual(empty);
    });

    it('rejects a method outside EnumMfaMethod', () => {
        const result = UserResetPasswordGenerateMfaResponseSchema.safeParse({
            ...row,
            methods: ['sms'],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['methods', 0],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a row with no challengeToken key', () => {
        const { challengeToken: _challengeToken, ...rest } = row;

        const result =
            UserResetPasswordGenerateMfaResponseSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['challengeToken'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('strips an undeclared key', () => {
        const result = UserResetPasswordGenerateMfaResponseSchema.parse({
            ...row,
            userId: 'user-one',
        });

        expect(result).toEqual(row);
    });
});
