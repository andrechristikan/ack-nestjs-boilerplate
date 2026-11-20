import { ActivityLogSessionAllActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-all-actor-metadata.dto';

describe('ActivityLogSessionAllActorMetadataSchema', () => {
    const payload = { targetUserId: 'user-1', sessionCount: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogSessionAllActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogSessionAllActorMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing sessionCount', () => {
        const result = ActivityLogSessionAllActorMetadataSchema.safeParse({
            targetUserId: 'user-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['sessionCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
