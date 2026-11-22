import { ActivityLogImportMetadataSchema } from '@modules/activity-log/dtos/activity-log.import-metadata.dto';

describe('ActivityLogImportMetadataSchema', () => {
    const payload = { userCount: 10 };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogImportMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogImportMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing userCount', () => {
        expect(() => ActivityLogImportMetadataSchema.parse({})).toThrow();
    });
});
