import { UserCheckEmailRequestSchema } from '@modules/user/dtos/request/user.check-email.request.dto';

describe('UserCheckEmailRequestSchema', () => {
    const payload = { email: 'john.doe@example.com' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserCheckEmailRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserCheckEmailRequestSchema.parse({ ...payload, username: 'john' })
        ).toThrow();
    });
});
