import { AnalyticImpossibleTravelSnapshotDataSchema } from '@modules/analytic/dtos/analytic.impossible-travel-snapshot-data.dto';

describe('AnalyticImpossibleTravelSnapshotDataSchema', () => {
    const payload = {
        userId: 'userId-1',
        fromSessionId: 'fromSessionId-1',
        toSessionId: 'toSessionId-1',
        distanceKm: 1,
        deltaMs: 2,
        undeclared: 'extra',
    };
    const expected = {
        userId: 'userId-1',
        fromSessionId: 'fromSessionId-1',
        toSessionId: 'toSessionId-1',
        distanceKm: 1,
        deltaMs: 2,
    };
    const invalid = {
        userId: 123,
        fromSessionId: 'fromSessionId-1',
        toSessionId: 'toSessionId-1',
        distanceKm: 1,
        deltaMs: 2,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticImpossibleTravelSnapshotDataSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with userId of the wrong type', () => {
        const result =
            AnalyticImpossibleTravelSnapshotDataSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['userId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
