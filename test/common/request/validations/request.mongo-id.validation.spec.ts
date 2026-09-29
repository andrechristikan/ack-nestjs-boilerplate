import { faker } from '@faker-js/faker';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';

describe('RequestMongoIdSchema', () => {
    it('parses a 24-character hex string', () => {
        const id = faker.database.mongodbObjectId();

        expect(RequestMongoIdSchema.parse(id)).toBe(id);
    });

    it('rejects a value shorter than 24 characters', () => {
        expect(() => RequestMongoIdSchema.parse('a'.repeat(23))).toThrow();
    });

    it('rejects a value carrying a non-hex character', () => {
        expect(() =>
            RequestMongoIdSchema.parse(`${'a'.repeat(23)}z`)
        ).toThrow();
    });
});
