import { SessionLoginCacheSchema } from '@modules/session/dtos/session.login-cache.dto';

describe('SessionLoginCacheSchema', () => {
    const payload = { jtiDigest: 'jtiDigest-1', undeclared: 'extra' };
    const expected = { jtiDigest: 'jtiDigest-1' };
    const invalid = { jtiDigest: 123 };

    it('parses a payload into exactly the declared fields', () => {
        const result = SessionLoginCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with jtiDigest of the wrong type', () => {
        const result = SessionLoginCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['jtiDigest'],
                code: 'invalid_type',
            }),
        ]);
    });
});
