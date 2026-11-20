import { UserImportRequestSchema } from '@modules/user/dtos/request/user.import.request.dto';

describe('UserImportRequestSchema', () => {
    const payload = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        username: 'developer123',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserImportRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = UserImportRequestSchema.safeParse({
            ...payload,
            roleId: 'role-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
