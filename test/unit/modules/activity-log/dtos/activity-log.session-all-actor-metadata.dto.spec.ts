import { ActivityLogSessionAllActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-all-actor-metadata.dto';

describe('ActivityLogSessionAllActorMetadataSchema', () => {
    const payload = { targetUserId: 'user-1', sessionCount: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogSessionAllActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogSessionAllActorMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing sessionCount', () => {
        expect(() =>
            ActivityLogSessionAllActorMetadataSchema.parse({
                targetUserId: 'user-1',
            })
        ).toThrow();
    });
});
