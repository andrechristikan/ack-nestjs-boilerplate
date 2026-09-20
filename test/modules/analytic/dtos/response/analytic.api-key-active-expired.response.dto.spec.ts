import { AnalyticApiKeyActiveExpiredResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-active-expired.response.dto';

describe('AnalyticApiKeyActiveExpiredResponseSchema', () => {
    const row = { active: 6, expired: 1 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticApiKeyActiveExpiredResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticApiKeyActiveExpiredResponseSchema.parse({
            ...row,
            hash: 'api-key-hash',
        });

        expect(result).toEqual(row);
    });
});
