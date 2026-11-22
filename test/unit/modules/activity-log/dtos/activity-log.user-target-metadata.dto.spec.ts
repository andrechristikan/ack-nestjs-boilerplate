import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';

describe('ActivityLogUserTargetMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = { actorUserId: 'user-1', timestamp };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogUserTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogUserTargetMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing timestamp', () => {
        expect(() =>
            ActivityLogUserTargetMetadataSchema.parse({
                actorUserId: 'user-1',
            })
        ).toThrow();
    });
});
