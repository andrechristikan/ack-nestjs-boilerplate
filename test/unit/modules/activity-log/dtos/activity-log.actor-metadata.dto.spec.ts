import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';

describe('ActivityLogActorMetadataSchema', () => {
    const payload = { targetUserId: 'user-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogActorMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing targetUserId', () => {
        expect(() => ActivityLogActorMetadataSchema.parse({})).toThrow();
    });
});
