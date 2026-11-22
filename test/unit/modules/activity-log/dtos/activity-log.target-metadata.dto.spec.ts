import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';

describe('ActivityLogTargetMetadataSchema', () => {
    const payload = { actorUserId: 'user-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogTargetMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing actorUserId', () => {
        expect(() => ActivityLogTargetMetadataSchema.parse({})).toThrow();
    });
});
