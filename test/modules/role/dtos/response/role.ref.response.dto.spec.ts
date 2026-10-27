import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleRefResponseSchema } from '@modules/role/dtos/response/role.ref.response.dto';

describe('RoleRefResponseSchema', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const ref = {
        id: 'role-id',
        scope: EnumRoleScope.workspace,
        key: 'member',
        name: 'Member',
    };

    it('keeps id, scope, key and name and strips every other column', () => {
        const parsed = RoleRefResponseSchema.parse({
            ...ref,
            description: 'extra',
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        });

        expect(parsed).toEqual(ref);
    });

    it('rejects a role without a key', () => {
        const { key: _key, ...withoutKey } = ref;

        expect(RoleRefResponseSchema.safeParse(withoutKey).success).toBe(false);
    });
});
