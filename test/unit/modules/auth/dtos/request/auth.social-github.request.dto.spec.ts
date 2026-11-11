import { AuthSocialGithubRequestSchema } from '@modules/auth/dtos/request/auth.social-github.request.dto';

describe('AuthSocialGithubRequestSchema', () => {
    const payload = {
        code: 'github-code',
        redirectUri: 'https://app.example.com/callback',
        codeVerifier: 'a'.repeat(43),
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AuthSocialGithubRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AuthSocialGithubRequestSchema.parse({ ...payload, extra: 'x' })
        ).toThrow();
    });

    it('trims the code', () => {
        const result = AuthSocialGithubRequestSchema.parse({
            ...payload,
            code: '  github-code  ',
        });

        expect(result.code).toBe('github-code');
    });

    it.each([
        ['42 characters', 'a'.repeat(42)],
        ['129 characters', 'a'.repeat(129)],
        ['a space', `${'a'.repeat(43)} `],
    ])('rejects a verifier with %s', (_label, codeVerifier) => {
        expect(() =>
            AuthSocialGithubRequestSchema.parse({ ...payload, codeVerifier })
        ).toThrow();
    });

    it('rejects a redirectUri that is not a URL', () => {
        expect(() =>
            AuthSocialGithubRequestSchema.parse({
                ...payload,
                redirectUri: 'not-a-url',
            })
        ).toThrow();
    });

    it.each(['code', 'redirectUri', 'codeVerifier'])(
        'rejects a payload missing %s',
        field => {
            const { [field]: _removed, ...rest } = payload as Record<
                string,
                string
            >;

            expect(() => AuthSocialGithubRequestSchema.parse(rest)).toThrow();
        }
    );
});
