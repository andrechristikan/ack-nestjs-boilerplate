import { DatabaseIdResponseSchema } from '@common/database/dtos/response/database.id.response.dto';

describe('DatabaseIdResponseSchema', () => {
    const id = '507f1f77bcf86cd799439011';

    it('parses a row into exactly the id field', () => {
        const result = DatabaseIdResponseSchema.parse({ id });

        expect(result).toEqual({ id });
    });

    it('strips every field beside id', () => {
        const result = DatabaseIdResponseSchema.parse({
            id,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual({ id });
    });

    it('rejects a missing id', () => {
        expect(() => DatabaseIdResponseSchema.parse({})).toThrow();
    });
});
