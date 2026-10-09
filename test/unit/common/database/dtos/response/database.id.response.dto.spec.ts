import { faker } from '@faker-js/faker';
import { DatabaseIdResponseSchema } from '@common/database/dtos/response/database.id.response.dto';

describe('DatabaseIdResponseSchema', () => {
    const id = faker.database.mongodbObjectId();

    it('parses a row into exactly the id field', () => {
        const result = DatabaseIdResponseSchema.parse({ id });

        expect(result).toEqual({ id });
    });

    it('strips every field beside id', () => {
        const result = DatabaseIdResponseSchema.parse({
            id,
            createdAt: new Date(),
            createdBy: null,
            updatedAt: new Date(),
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
