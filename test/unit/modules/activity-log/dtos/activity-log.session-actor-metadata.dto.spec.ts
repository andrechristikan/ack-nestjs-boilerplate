import { ActivityLogSessionActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-actor-metadata.dto';

describe('ActivityLogSessionActorMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        targetUserId: 'user-1',
        targetUsername: 'jane',
        timestamp,
        sessionId: 'session-1',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogSessionActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogSessionActorMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing sessionId', () => {
        const result = ActivityLogSessionActorMetadataSchema.safeParse({
            targetUserId: 'user-1',
            targetUsername: 'jane',
            timestamp,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['sessionId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
