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
        const result = ActivityLogSessionTargetMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing sessionId', () => {
        const result = ActivityLogSessionTargetMetadataSchema.safeParse({
            actorUserId: 'user-1',
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
