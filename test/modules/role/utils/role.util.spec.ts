import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { RoleUtil } from '@modules/role/utils/role.util';

describe('RoleUtil', () => {
    describe('mapActivityLogMetadata', () => {
        it('maps role identity, key, scope and the given timestamp', () => {
            const timestamp = new Date('2026-01-02T00:00:00.000Z');
            const role = {
                id: 'role-id',
                scope: EnumRoleScope.platform,
                key: EnumRolePlatformKey.admin,
                name: 'Admin',
            };

            expect(
                new RoleUtil().mapActivityLogMetadata(role, timestamp)
            ).toEqual({
                roleId: 'role-id',
                roleName: 'Admin',
                roleKey: EnumRolePlatformKey.admin,
                roleScope: EnumRoleScope.platform,
                timestamp,
            });
        });
    });
});
