import { AnalyticImpossibleTravelResponseSchema } from '@modules/analytic/dtos/response/analytic.impossible-travel.response.dto';

describe('AnalyticImpossibleTravelResponseSchema', () => {
    const row = {
        userId: 'user-1',
        fromSessionId: 'session-1',
        toSessionId: 'session-2',
        distanceKm: 1200.5,
        deltaMs: 60000,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticImpossibleTravelResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticImpossibleTravelResponseSchema.parse({
            ...row,
            password: 'secret',
        });

        expect(result).toEqual(row);
    });
});
