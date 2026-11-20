import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';

describe('RequestRequiredStringSchema', () => {
    it('parses a non-empty string', () => {
        expect(RequestRequiredStringSchema.parse('value')).toBe('value');
    });

    it('rejects an empty string', () => {
        const result = RequestRequiredStringSchema.safeParse('');

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'too_small' }),
        ]);
    });
});
