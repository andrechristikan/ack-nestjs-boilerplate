import { AnalyticImpossibleTravelSnapshotMetaSchema } from '@modules/analytic/dtos/analytic.impossible-travel-snapshot-meta.dto';

describe('AnalyticImpossibleTravelSnapshotMetaSchema', () => {
    const payload = { minDistanceKm: 1, maxDeltaInMs: 2, undeclared: 'extra' };
    const expected = { minDistanceKm: 1, maxDeltaInMs: 2 };
    const invalid = { minDistanceKm: 'text', maxDeltaInMs: 2 };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticImpossibleTravelSnapshotMetaSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with minDistanceKm of the wrong type', () => {
        const result =
            AnalyticImpossibleTravelSnapshotMetaSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['minDistanceKm'],
                code: 'invalid_type',
            }),
        ]);
    });
});
