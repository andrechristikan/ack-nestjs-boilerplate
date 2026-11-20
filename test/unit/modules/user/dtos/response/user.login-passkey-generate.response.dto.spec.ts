import { UserLoginPasskeyGenerateResponseSchema } from '@modules/user/dtos/response/user.login-passkey-generate.response.dto';

describe('UserLoginPasskeyGenerateResponseSchema', () => {
    const row = {
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
        const result = UserLoginPasskeyGenerateResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects a null passkeyOptions', () => {
        const result = UserLoginPasskeyGenerateResponseSchema.safeParse({
            ...row,
            passkeyOptions: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyOptions'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a row with no passkeyOptions key', () => {
        const result = UserLoginPasskeyGenerateResponseSchema.safeParse({
            challengeToken: row.challengeToken,
            expiresInMs: row.expiresInMs,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['passkeyOptions'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('strips an undeclared key', () => {
        const result = UserLoginPasskeyGenerateResponseSchema.parse({
            ...row,
            methods: ['passkey'],
        });

        expect(result).toEqual(row);
    });
});
