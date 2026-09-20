import { AnalyticCredentialStuffingResponseSchema } from '@modules/analytic/dtos/response/analytic.credential-stuffing.response.dto';

describe('AnalyticCredentialStuffingResponseSchema', () => {
    const row = {
        ipAddress: '10.0.0.1',
        uniqueUsers: 25,
        failCount: 180,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticCredentialStuffingResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticCredentialStuffingResponseSchema.parse({
            ...row,
            email: 'user@example.com',
        });

        expect(result).toEqual(row);
    });
});
