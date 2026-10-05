import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

describe('DatabaseResponseSchema', () => {
    const row = {
        id: faker.database.mongodbObjectId(),
        createdAt: new Date(),
        createdBy: faker.database.mongodbObjectId(),
        updatedAt: new Date(),
        updatedBy: faker.database.mongodbObjectId(),
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
