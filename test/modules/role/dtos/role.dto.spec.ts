import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { RoleSchema } from '@modules/role/dtos/role.dto';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';

describe('RoleSchema', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const role = {
        id: 'role-id',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        name: 'Admin',
        description: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: [
            {
                id: 'policy-id',
                roleId: 'role-id',
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read],
                conditions: null,
                inverted: false,
                reason: null,
                priority: 1,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
            },
        ],
    };

    it('serializes key, scope and abilities while stripping internal relation data', () => {
        const serialized = RoleSchema.parse({
            ...role,
            users: [{ id: 'user-id', password: 'hash' }],
            _count: { users: 1 },
        });

        expect(serialized.key).toBe(EnumRolePlatformKey.admin);
        expect(serialized.scope).toBe(EnumRoleScope.platform);
        expect(serialized.policies).toHaveLength(1);
        expect(serialized).not.toHaveProperty('users');
        expect(serialized).not.toHaveProperty('_count');
        expect(serialized).not.toHaveProperty('type');
    });

    it('rejects a role without a key', () => {
        const { key: _key, ...withoutKey } = role;

        expect(RoleSchema.safeParse(withoutKey).success).toBe(false);
    });

    it('rejects an unknown scope', () => {
        expect(RoleSchema.safeParse({ ...role, scope: 'global' }).success).toBe(
            false
        );
    });
});
