import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';

describe('ActivityLogActorMetadataSchema', () => {
    const payload = { targetUserId: 'user-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogActorMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing targetUserId', () => {
        const result = ActivityLogActorMetadataSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
