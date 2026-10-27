import { EnumRoleScope } from '@generated/prisma-client/client';
import { ActivityLogRoleMetadataSchema } from '@modules/activity-log/dtos/activity-log.role-metadata.dto';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';

describe('ActivityLogRoleMetadataSchema', () => {
    it('accepts the role identity, key, scope and timestamp', () => {
        const metadata = {
            roleId: 'role-id',
            roleName: 'Admin',
            roleKey: EnumRolePlatformKey.admin,
            roleScope: EnumRoleScope.platform,
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
        };

        expect(ActivityLogRoleMetadataSchema.parse(metadata)).toEqual(metadata);
    });

    it('rejects the removed roleType key', () => {
        expect(
            ActivityLogRoleMetadataSchema.safeParse({ roleType: 'admin' })
                .success
        ).toBe(false);
    });

    it('rejects a non-string role key', () => {
        expect(
            ActivityLogRoleMetadataSchema.safeParse({ roleKey: 1 }).success
        ).toBe(false);
    });
});
