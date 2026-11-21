import { ActivityLogExportMetadataSchema } from '@modules/activity-log/dtos/activity-log.export-metadata.dto';

describe('ActivityLogExportMetadataSchema', () => {
    const payload = { count: 3 };

    it('parses a payload into exactly the declared fields', () => {
        expect(ActivityLogExportMetadataSchema.parse(payload)).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogExportMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing count', () => {
        const result = ActivityLogExportMetadataSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['count'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a negative count', () => {
        const result = ActivityLogExportMetadataSchema.safeParse({ count: -1 });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['count'], code: 'too_small' }),
        ]);
    });

    it('rejects a fractional count', () => {
        const result = ActivityLogExportMetadataSchema.safeParse({
            count: 1.5,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['count'], code: 'invalid_type' }),
        ]);
    });
});
