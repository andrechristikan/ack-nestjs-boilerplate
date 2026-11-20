import { UserCheckEmailRequestSchema } from '@modules/user/dtos/request/user.check-email.request.dto';

describe('UserCheckEmailRequestSchema', () => {
    const payload = { email: 'john.doe@example.com' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserCheckEmailRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = UserCheckEmailRequestSchema.safeParse({
            ...payload,
            username: 'john',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
