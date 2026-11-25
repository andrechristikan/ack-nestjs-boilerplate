import { AnalyticBucketsSnapshotMetaSchema } from '@modules/analytic/dtos/analytic.buckets-snapshot-meta.dto';

describe('AnalyticBucketsSnapshotMetaSchema', () => {
    const payload = {
        buckets: [{ key: '1', count: 2, undeclared: 'extra' }],
        undeclared: 'extra',
    };
    const expected = { buckets: [{ key: '1', count: 2 }] };
    const invalid = { buckets: [{ key: '1', count: 'text' }] };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticBucketsSnapshotMetaSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a bucket with count of the wrong type', () => {
        const result = AnalyticBucketsSnapshotMetaSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['buckets', 0, 'count'],
                code: 'invalid_type',
            }),
        ]);
    });
});
