import { UserCheckUsernameRequestSchema } from '@modules/user/dtos/request/user.check-username.request.dto';

describe('UserCheckUsernameRequestSchema', () => {
    const payload = { username: 'developer123' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserCheckUsernameRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserCheckUsernameRequestSchema.parse({ ...payload, email: 'x' })
        ).toThrow();
    });
});
