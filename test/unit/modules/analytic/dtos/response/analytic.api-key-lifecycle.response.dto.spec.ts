import { AnalyticApiKeyLifecycleResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-lifecycle.response.dto';

describe('AnalyticApiKeyLifecycleResponseSchema', () => {
    const row = { created: 1, reset: 2, updated: 3, deleted: 4 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticApiKeyLifecycleResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticApiKeyLifecycleResponseSchema.parse({
            ...row,
            hash: 'api-key-hash',
        });

        expect(result).toEqual(row);
    });
});
