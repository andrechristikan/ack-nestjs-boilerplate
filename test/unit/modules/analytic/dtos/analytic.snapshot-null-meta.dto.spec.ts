import { AnalyticSnapshotNullMetaSchema } from '@modules/analytic/dtos/analytic.snapshot-null-meta.dto';

describe('AnalyticSnapshotNullMetaSchema', () => {
    const payload = null;
    const expected = null;
    const invalid = 'text';

    it('parses its one valid value', () => {
        const result = AnalyticSnapshotNullMetaSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with the value of the wrong type', () => {
        const result = AnalyticSnapshotNullMetaSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [],
                code: 'invalid_type',
            }),
        ]);
    });
});
