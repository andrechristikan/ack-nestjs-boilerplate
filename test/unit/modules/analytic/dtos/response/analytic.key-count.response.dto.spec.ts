import { AnalyticKeyCountResponseSchema } from '@modules/analytic/dtos/response/analytic.key-count.response.dto';

describe('AnalyticKeyCountResponseSchema', () => {
    const row = {
        key: '10.0.0.1',
        count: 42,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticKeyCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticKeyCountResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
