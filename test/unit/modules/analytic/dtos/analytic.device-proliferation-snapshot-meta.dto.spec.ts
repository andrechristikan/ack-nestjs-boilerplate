import { AnalyticDeviceProliferationSnapshotMetaSchema } from '@modules/analytic/dtos/analytic.device-proliferation-snapshot-meta.dto';

describe('AnalyticDeviceProliferationSnapshotMetaSchema', () => {
    const payload = {
        avg: 1,
        stdDev: 2,
        zScoreThreshold: 3,
        undeclared: 'extra',
    };
    const expected = { avg: 1, stdDev: 2, zScoreThreshold: 3 };
    const invalid = { avg: 'text', stdDev: 2, zScoreThreshold: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticDeviceProliferationSnapshotMetaSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with avg of the wrong type', () => {
        const result =
            AnalyticDeviceProliferationSnapshotMetaSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['avg'],
                code: 'invalid_type',
            }),
        ]);
    });
});
