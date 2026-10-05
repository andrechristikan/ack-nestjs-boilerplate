import { AnalyticTermPolicyAcceptanceRateResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-acceptance-rate.response.dto';

describe('AnalyticTermPolicyAcceptanceRateResponseSchema', () => {
    const row = { acceptances: 4, users: 8, published: 2, rate: 0.5 };

    it('parses a row into exactly the declared fields', () => {
        const result =
            AnalyticTermPolicyAcceptanceRateResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticTermPolicyAcceptanceRateResponseSchema.parse({
            ...row,
            userIds: ['user-1'],
        });

        expect(result).toEqual(row);
    });
});
