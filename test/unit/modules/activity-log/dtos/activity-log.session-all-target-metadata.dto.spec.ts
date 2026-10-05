import { ActivityLogSessionAllTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-all-target-metadata.dto';

describe('ActivityLogSessionAllTargetMetadataSchema', () => {
    const payload = { actorUserId: 'user-1', sessionCount: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogSessionAllTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogSessionAllTargetMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing sessionCount', () => {
        expect(() =>
            ActivityLogSessionAllTargetMetadataSchema.parse({
                actorUserId: 'user-1',
            })
        ).toThrow();
    });
});
