import { ActivityLogSessionAllTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-all-target-metadata.dto';

describe('ActivityLogSessionAllTargetMetadataSchema', () => {
    const payload = { actorUserId: 'user-1', sessionCount: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogSessionAllTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogSessionAllTargetMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing sessionCount', () => {
        const result = ActivityLogSessionAllTargetMetadataSchema.safeParse({
            actorUserId: 'user-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['sessionCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
