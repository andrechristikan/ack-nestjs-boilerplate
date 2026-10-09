import { UserTermPolicySchema } from '@modules/user/dtos/user.term-policy.dto';

describe('UserTermPolicySchema', () => {
    const row = {
        termsOfService: true,
        privacy: true,
        cookies: true,
        marketing: false,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserTermPolicySchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserTermPolicySchema.parse({
            ...row,
            newsletter: true,
        });

        expect(result).toEqual(row);
    });
});
