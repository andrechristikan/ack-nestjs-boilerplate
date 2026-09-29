import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

describe('UserRefResponseSchema', () => {
    const row = {
        id: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'John Doe',
        username: 'johnSmith123',
        photo: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserRefResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserRefResponseSchema.parse({
            ...row,
            email: 'john.doe@example.com',
        });

        expect(result).toEqual(row);
    });
});
