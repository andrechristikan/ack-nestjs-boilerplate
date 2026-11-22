import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

describe('DatabaseResponseSchema', () => {
    const row = {
        id: '507f1f77bcf86cd799439011',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: '507f1f77bcf86cd799439011',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: '507f1f77bcf86cd799439011',
        deletedAt: null,
        deletedBy: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = DatabaseResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = DatabaseResponseSchema.parse({
            ...row,
            extra: 'unexpected',
        });

        expect(result).toEqual(row);
    });

    it('accepts null on every nullable audit field', () => {
        const nullRow = {
            ...row,
            createdBy: null,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        };

        const result = DatabaseResponseSchema.parse(nullRow);

        expect(result).toEqual(nullRow);
    });

    it('rejects a missing required field', () => {
        const { id: _id, ...withoutId } = row;

        expect(() => DatabaseResponseSchema.parse(withoutId)).toThrow();
    });
});
