import { AnalyticImpossibleTravelPipelineSchema } from '@modules/analytic/dtos/analytic.impossible-travel-pipeline.dto';

describe('AnalyticImpossibleTravelPipelineSchema', () => {
    const payload = [
        {
            userId: { $oid: '$oid-1' },
            fromSessionId: { $oid: '$oid-1' },
            toSessionId: { $oid: '$oid-1' },
            distanceKm: 1,
            deltaMs: 2,
            occurredAt: '2026-01-02T03:04:05.000Z',
            undeclared: 'extra',
        },
    ];
    const expected = [
        {
            userId: '$oid-1',
            fromSessionId: '$oid-1',
            toSessionId: '$oid-1',
            distanceKm: 1,
            deltaMs: 2,
            occurredAt: new Date('2026-01-02T03:04:05.000Z'),
        },
    ];
    const invalid = [
        {
            userId: { $oid: 123 },
            fromSessionId: { $oid: '$oid-1' },
            toSessionId: { $oid: '$oid-1' },
            distanceKm: 1,
            deltaMs: 2,
            occurredAt: '2026-01-02T03:04:05.000Z',
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticImpossibleTravelPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.userId.$oid of the wrong type', () => {
        const result =
            AnalyticImpossibleTravelPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'userId', '$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});
