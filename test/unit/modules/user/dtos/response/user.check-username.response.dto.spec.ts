import { UserCheckUsernameResponseSchema } from '@modules/user/dtos/response/user.check-username.response.dto';

describe('UserCheckUsernameResponseSchema', () => {
    const row = { badWord: false, exist: false, pattern: true };

    it('parses a row into exactly the declared fields', () => {
        const result = UserCheckUsernameResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserCheckUsernameResponseSchema.parse({
            ...row,
            username: 'johnSmith123',
        });

        expect(result).toEqual(row);
    });
});
