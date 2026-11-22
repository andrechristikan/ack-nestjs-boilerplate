import { ActivityLogRoleMetadataSchema } from '@modules/activity-log/dtos/activity-log.role-metadata.dto';

describe('ActivityLogRoleMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        roleId: 'role-1',
        roleName: 'admin',
        roleType: 'admin',
        timestamp,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogRoleMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with every field omitted', () => {
        const result = ActivityLogRoleMetadataSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogRoleMetadataSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
