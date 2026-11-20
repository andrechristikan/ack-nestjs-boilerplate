import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';

describe('ActivityLogUserTargetMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = { actorUserId: 'user-1', timestamp };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogUserTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogUserTargetMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing timestamp', () => {
        const result = ActivityLogUserTargetMetadataSchema.safeParse({
            actorUserId: 'user-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['timestamp'],
                code: 'invalid_union',
            }),
        ]);
    });
});
