import { AnalyticDeviceProliferationSnapshotDataSchema } from '@modules/analytic/dtos/analytic.device-proliferation-snapshot-data.dto';

describe('AnalyticDeviceProliferationSnapshotDataSchema', () => {
    const payload = {
        userId: 'userId-1',
        deviceCount: 1,
        zScore: 2,
        undeclared: 'extra',
    };
    const expected = { userId: 'userId-1', deviceCount: 1, zScore: 2 };
    const invalid = { userId: 123, deviceCount: 1, zScore: 2 };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticDeviceProliferationSnapshotDataSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with userId of the wrong type', () => {
        const result =
            AnalyticDeviceProliferationSnapshotDataSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['userId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
