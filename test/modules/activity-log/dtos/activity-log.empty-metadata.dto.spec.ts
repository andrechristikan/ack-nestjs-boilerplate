import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';

describe('ActivityLogEmptyMetadataSchema', () => {
    it('parses an empty payload', () => {
        const result = ActivityLogEmptyMetadataSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogEmptyMetadataSchema.parse({ extra: true })
        ).toThrow();
    });
});
