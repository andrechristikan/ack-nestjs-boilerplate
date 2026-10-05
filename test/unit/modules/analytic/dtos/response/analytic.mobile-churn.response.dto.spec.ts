import { AnalyticMobileChurnResponseSchema } from '@modules/analytic/dtos/response/analytic.mobile-churn.response.dto';

describe('AnalyticMobileChurnResponseSchema', () => {
    const row = { added: 1, updated: 2, deleted: 3 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticMobileChurnResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticMobileChurnResponseSchema.parse({
            ...row,
            numbers: ['+15555550100'],
        });

        expect(result).toEqual(row);
    });
});
