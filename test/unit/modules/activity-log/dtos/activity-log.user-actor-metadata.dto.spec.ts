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
        expect(() =>
            ActivityLogUserActorMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing field', () => {
        expect(() =>
            ActivityLogUserActorMetadataSchema.parse({
                targetUserId: 'user-1',
            })
        ).toThrow();
    });
});
