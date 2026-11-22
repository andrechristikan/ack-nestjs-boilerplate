import { AnalyticSharedFingerprintSnapshotDataSchema } from '@modules/analytic/dtos/analytic.shared-fingerprint-snapshot-data.dto';

describe('AnalyticSharedFingerprintSnapshotDataSchema', () => {
    const payload = {
        fingerprint: 'fingerprint-1',
        userCount: 1,
        userIds: ['userIds-1'],
        undeclared: 'extra',
    };
    const expected = {
        fingerprint: 'fingerprint-1',
        userCount: 1,
        userIds: ['userIds-1'],
    };
    const invalid = { fingerprint: 123, userCount: 1, userIds: ['userIds-1'] };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticSharedFingerprintSnapshotDataSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with fingerprint of the wrong type', () => {
        const result =
            AnalyticSharedFingerprintSnapshotDataSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['fingerprint'],
                code: 'invalid_type',
            }),
        ]);
    });
});
