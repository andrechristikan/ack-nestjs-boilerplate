import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';

describe('RequestMongoIdSchema', () => {
    it('parses a 24-character hex string', () => {
        const id = '507f1f77bcf86cd799439011';

        expect(RequestMongoIdSchema.parse(id)).toBe(id);
    });

    it('rejects a value shorter than 24 characters', () => {
        const result = RequestMongoIdSchema.safeParse('a'.repeat(23));

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'too_small' }),
        ]);
    });

    it('rejects a value carrying a non-hex character', () => {
        const result = RequestMongoIdSchema.safeParse(`${'a'.repeat(23)}z`);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'invalid_format' }),
        ]);
    });
});
