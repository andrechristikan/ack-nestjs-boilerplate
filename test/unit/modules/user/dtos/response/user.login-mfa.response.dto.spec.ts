import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserLoginMfaResponseSchema } from '@modules/user/dtos/response/user.login-mfa.response.dto';

describe('UserLoginMfaResponseSchema', () => {
    const row = {
        challengeToken: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
        expiresInMs: 300000,
        methods: [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
        passkeyOptions: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserLoginMfaResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses the passkey options of a user with a passkey', () => {
        const withPasskey = {
            ...row,
            methods: [EnumMfaMethod.passkey],
            passkeyOptions: {
                challenge: 'challengeQuartz',
                rpId: 'example.test',
                allowCredentials: [
                    {
                        id: 'credential-one',
                        type: 'public-key',
                        transports: ['internal'],
                    },
                ],
                userVerification: 'required',
            },
        };

        const result = UserLoginMfaResponseSchema.parse(withPasskey);

        expect(result).toEqual(withPasskey);
    });

    it('rejects a method outside the enum', () => {
        const result = UserLoginMfaResponseSchema.safeParse({
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

    it('rejects a row with no passkeyOptions key', () => {
        const result = UserLoginMfaResponseSchema.safeParse({
            challengeToken: row.challengeToken,
            expiresInMs: row.expiresInMs,
            methods: row.methods,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyOptions'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('strips an undeclared key', () => {
        const result = UserLoginMfaResponseSchema.parse({
            ...row,
            secret: 'JBSWY3DPEHPK3PXP',
            backupCodesRemaining: 8,
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without a challenge token', () => {
        const result = UserLoginMfaResponseSchema.safeParse({
            expiresInMs: 300000,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['challengeToken'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['methods'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['passkeyOptions'],
                code: 'invalid_type',
            }),
        ]);
    });
});
