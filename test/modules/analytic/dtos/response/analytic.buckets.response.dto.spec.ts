import { AnalyticBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.buckets.response.dto';

describe('AnalyticBucketsResponseSchema', () => {
    const row = { buckets: [{ key: 'email', count: 42 }] };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticBucketsResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticBucketsResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
