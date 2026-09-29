import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';

describe('RequestBooleanStringSchema', () => {
    it('parses "true" into true', () => {
        expect(RequestBooleanStringSchema.parse('true')).toBe(true);
    });

    it('parses "false" into false', () => {
        expect(RequestBooleanStringSchema.parse('false')).toBe(false);
    });

    it('rejects a differently-cased value', () => {
        expect(() => RequestBooleanStringSchema.parse('True')).toThrow();
    });

    it('rejects a non-boolean string', () => {
        expect(() => RequestBooleanStringSchema.parse('yes')).toThrow();
    });
});
