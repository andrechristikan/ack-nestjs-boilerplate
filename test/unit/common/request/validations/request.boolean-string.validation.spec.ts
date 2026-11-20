import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';

describe('RequestBooleanStringSchema', () => {
    it('parses "true" into true', () => {
        expect(RequestBooleanStringSchema.parse('true')).toBe(true);
    });

    it('parses "false" into false', () => {
        expect(RequestBooleanStringSchema.parse('false')).toBe(false);
    });

    it('rejects a differently-cased value', () => {
        const result = RequestBooleanStringSchema.safeParse('True');

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'invalid_value' }),
        ]);
    });

    it('rejects a non-boolean string', () => {
        const result = RequestBooleanStringSchema.safeParse('yes');

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'invalid_value' }),
        ]);
    });
});
