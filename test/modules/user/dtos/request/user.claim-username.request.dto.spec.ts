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
        expect(() =>
            UserClaimUsernameRequestSchema.parse({ username: 'ab' })
        ).toThrow();
    });

    it('rejects a username with a character outside the allowed pattern', () => {
        expect(() =>
            UserClaimUsernameRequestSchema.parse({ username: 'john-doe' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserClaimUsernameRequestSchema.parse({
                ...payload,
                role: 'admin',
            })
        ).toThrow();
    });
});
