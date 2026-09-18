import { describe, expect, it } from 'vitest';

import { EnumRoleType, type Role } from '@generated/prisma-client';
import { RoleUtil } from '@modules/role/utils/role.util';

describe('RoleUtil', () => {
    it('maps role identity and the latest audit timestamp', () => {
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        const updatedAt = new Date('2026-01-02T00:00:00.000Z');
        const role = {
            id: 'role-id',
            name: 'Admin',
            description: null,
            type: EnumRoleType.admin,
            createdAt,
            createdBy: null,
            updatedAt,
            updatedBy: null,
        } satisfies Role;

        expect(new RoleUtil().mapActivityLogMetadata(role)).toEqual({
            roleId: 'role-id',
            roleName: 'Admin',
            roleType: EnumRoleType.admin,
            timestamp: updatedAt,
        });
    });
});
