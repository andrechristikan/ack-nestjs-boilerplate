import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';

describe('UserClaimUsernameRequestSchema', () => {
    const payload = { username: 'developer123' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserClaimUsernameRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims and lower-cases the username', () => {
        const result = UserClaimUsernameRequestSchema.parse({
            username: '  Developer123  ',
        });

        expect(result).toEqual({ username: 'developer123' });
    });

    it('rejects a username shorter than 3 characters', () => {
        const result = UserClaimUsernameRequestSchema.safeParse({
            username: 'ab',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['username'], code: 'too_small' }),
        ]);
    });

    it('accepts the dash and underscore the username pattern allows', () => {
        const result = UserClaimUsernameRequestSchema.parse({
            username: 'john_doe-1',
        });

        expect(result).toEqual({ username: 'john_doe-1' });
    });

    it('rejects a username with a character outside the allowed pattern', () => {
        const result = UserClaimUsernameRequestSchema.safeParse({
            username: 'john doe',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['username'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserClaimUsernameRequestSchema.safeParse({
            ...payload,
            role: 'admin',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
