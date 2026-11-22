import { UserCheckEmailResponseSchema } from '@modules/user/dtos/response/user.check-email.response.dto';

describe('UserCheckEmailResponseSchema', () => {
    const row = { badWord: false, exist: false };

    it('parses a row into exactly the declared fields', () => {
        const result = UserCheckEmailResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserCheckEmailResponseSchema.parse({
            ...row,
            email: 'john.doe@example.com',
        });

        expect(result).toEqual(row);
    });
});
