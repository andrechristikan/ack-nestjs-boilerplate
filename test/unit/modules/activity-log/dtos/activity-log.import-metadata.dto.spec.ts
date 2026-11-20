import { ActivityLogImportMetadataSchema } from '@modules/activity-log/dtos/activity-log.import-metadata.dto';

describe('ActivityLogImportMetadataSchema', () => {
    const payload = { userCount: 10 };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogImportMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogImportMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing userCount', () => {
        const result = ActivityLogImportMetadataSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['userCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
