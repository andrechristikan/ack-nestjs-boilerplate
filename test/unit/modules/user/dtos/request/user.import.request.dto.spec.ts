import { UserImportRequestSchema } from '@modules/user/dtos/request/user.import.request.dto';

describe('UserImportRequestSchema', () => {
    const payload = {
        email: 'john.doe@example.com',
        name: 'john doe',
        username: 'developer123',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserImportRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims and lower-cases the name inherited from the create schema', () => {
        const result = UserImportRequestSchema.parse({
            ...payload,
            name: '  John DOE  ',
        });

        expect(result.name).toBe('john doe');
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
