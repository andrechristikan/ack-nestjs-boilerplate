import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleUtil } from '@modules/role/utils/role.util';

describe('RoleUtil', () => {
    let util: RoleUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [RoleUtil],
        }).compile();

        util = module.get(RoleUtil);
    });

    describe('mapActivityLogMetadata', () => {
        it('maps the role fields and timestamp into activity log metadata', () => {
            const role: IRole = {
                id: 'role-1',
                scope: EnumRoleScope.platform,
                key: EnumRolePlatformKey.admin,
                policyRevision: 0,
                description: null,
                name: 'manager',
                isImmutable: false,
            };
            const timestamp = new Date('2026-01-20T00:00:00.000Z');

            const result = util.mapActivityLogMetadata(role, timestamp);

            expect(result).toEqual({
                roleId: role.id,
                roleName: role.name,
                roleKey: role.key,
                roleScope: role.scope,
                timestamp,
            });
        });
    });
});
