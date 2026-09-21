import { AnalyticTermPolicyTimeToAcceptResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-time-to-accept.response.dto';

describe('AnalyticTermPolicyTimeToAcceptResponseSchema', () => {
    const row = { count: 3, averageMs: 1500 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticTermPolicyTimeToAcceptResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticTermPolicyTimeToAcceptResponseSchema.parse({
            ...row,
            userId: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
