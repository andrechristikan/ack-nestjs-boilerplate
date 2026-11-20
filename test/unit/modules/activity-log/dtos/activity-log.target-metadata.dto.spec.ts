import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';

describe('ActivityLogTargetMetadataSchema', () => {
    const payload = { actorUserId: 'user-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogTargetMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing actorUserId', () => {
        const result = ActivityLogTargetMetadataSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['actorUserId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
