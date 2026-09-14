import { describe, expect, it } from 'vitest';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client';
import { RoleSchema } from '@modules/role/dtos/role.dto';

describe('RoleSchema', () => {
    it('serializes role abilities while stripping internal relation data', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const serialized = RoleSchema.parse({
            id: 'role-id',
            name: 'Admin',
            description: null,
            type: EnumRoleType.admin,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [
                {
                    id: 'policy-id',
                    roleId: 'role-id',
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.read],
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                },
            ],
            users: [{ id: 'user-id', password: 'hash' }],
            _count: { users: 1 },
        });

        expect(serialized.policies).toHaveLength(1);
        expect(serialized).not.toHaveProperty('users');
        expect(serialized).not.toHaveProperty('_count');
    });
});
