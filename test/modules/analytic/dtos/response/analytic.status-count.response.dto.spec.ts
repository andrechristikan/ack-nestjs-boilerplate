import { AnalyticStatusCountResponseSchema } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';

describe('AnalyticStatusCountResponseSchema', () => {
    const row = { statuses: [{ status: 'pending', count: 2 }] };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticStatusCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticStatusCountResponseSchema.parse({
            ...row,
            userId: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
