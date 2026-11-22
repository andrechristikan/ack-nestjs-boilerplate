import { AnalyticSharedFingerprintPipelineSchema } from '@modules/analytic/dtos/analytic.shared-fingerprint-pipeline.dto';

describe('AnalyticSharedFingerprintPipelineSchema', () => {
    const payload = [
        {
            fingerprint: 'fingerprint-1',
            userCount: 1,
            userIds: [{ $oid: '$oid-1' }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        { fingerprint: 'fingerprint-1', userCount: 1, userIds: ['$oid-1'] },
    ];
    const invalid = [
        { fingerprint: 123, userCount: 1, userIds: [{ $oid: '$oid-1' }] },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticSharedFingerprintPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.fingerprint of the wrong type', () => {
        const result =
            AnalyticSharedFingerprintPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'fingerprint'],
                code: 'invalid_type',
            }),
        ]);
    });
});
