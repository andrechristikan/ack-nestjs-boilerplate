import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';

describe('RequestMongoIdSchema', () => {
    it('parses a 24-character hex string', () => {
        const id = '507f1f77bcf86cd799439011';

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
