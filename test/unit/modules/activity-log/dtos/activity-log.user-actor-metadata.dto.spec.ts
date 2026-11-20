import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';

describe('ActivityLogUserActorMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        targetUserId: 'user-1',
        targetUsername: 'jane',
        timestamp,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogUserActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogUserActorMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing field', () => {
        const result = ActivityLogUserActorMetadataSchema.safeParse({
            targetUserId: 'user-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUsername'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['timestamp'],
                code: 'invalid_union',
            }),
        ]);
    });
});
