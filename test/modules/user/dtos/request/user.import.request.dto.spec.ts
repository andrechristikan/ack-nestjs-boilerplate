import { UserImportRequestSchema } from '@modules/user/dtos/request/user.import.request.dto';

describe('UserImportRequestSchema', () => {
    const valid = {
        username: 'imported',
        email: 'IMPORTED@example.com',
        name: 'Imported User',
    };

    it('normalizes an imported row', () => {
        expect(UserImportRequestSchema.parse(valid)).toEqual({
            ...valid,
            email: 'imported@example.com',
        });
    });

    it.each([
        { ...valid, username: 'x' },
        { ...valid, email: 'invalid' },
        { ...valid, name: '' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown rows', input => {
        expect(UserImportRequestSchema.safeParse(input).success).toBe(false);
    });
});
