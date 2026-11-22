import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';

describe('RequestRequiredStringSchema', () => {
    it('parses a non-empty string', () => {
        expect(RequestRequiredStringSchema.parse('value')).toBe('value');
    });

    it('rejects an empty string', () => {
        expect(() => RequestRequiredStringSchema.parse('')).toThrow();
    });
});
