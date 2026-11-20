import { AnalyticSnapshotBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.snapshot-buckets.response.dto';

describe('AnalyticSnapshotBucketsResponseSchema', () => {
    const buckets = [{ key: 'email', count: 42 }];

    it('parses computedAt as a date', () => {
        const computedAt = new Date('2026-01-01T00:00:00.000Z');

        const result = AnalyticSnapshotBucketsResponseSchema.parse({
            buckets,
            computedAt,
        });

        expect(result).toEqual({ buckets, computedAt });
    });

    it('parses computedAt as null', () => {
        const result = AnalyticSnapshotBucketsResponseSchema.parse({
            buckets,
            computedAt: null,
        });

        expect(result).toEqual({ buckets, computedAt: null });
    });

    it('rejects a missing computedAt', () => {
        const result = AnalyticSnapshotBucketsResponseSchema.safeParse({
            buckets,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });
});
