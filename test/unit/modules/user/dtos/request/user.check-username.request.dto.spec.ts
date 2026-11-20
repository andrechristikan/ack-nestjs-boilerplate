import { UserCheckUsernameRequestSchema } from '@modules/user/dtos/request/user.check-username.request.dto';

describe('UserCheckUsernameRequestSchema', () => {
    const payload = { username: 'developer123' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserCheckUsernameRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = UserCheckUsernameRequestSchema.safeParse({
            ...payload,
            email: 'x',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
