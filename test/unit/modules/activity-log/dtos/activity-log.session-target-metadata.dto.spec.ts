import { ActivityLogSessionTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-target-metadata.dto';

describe('ActivityLogSessionTargetMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        actorUserId: 'user-1',
        timestamp,
        sessionId: 'session-1',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogSessionTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogSessionTargetMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing sessionId', () => {
        expect(() =>
            ActivityLogSessionTargetMetadataSchema.parse({
                actorUserId: 'user-1',
                timestamp,
            })
        ).toThrow();
    });
});
