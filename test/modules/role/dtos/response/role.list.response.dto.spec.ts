import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';

describe('RoleListResponseSchema', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const listed = {
        id: 'role-id',
        scope: EnumRoleScope.workspace,
        key: 'member',
        name: 'Member',
        description: 'Regular member',
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: 3,
    };

    it('keeps the description and the policy count', () => {
        const parsed = RoleListResponseSchema.parse(listed);

        expect(parsed.description).toBe('Regular member');
        expect(parsed.policies).toBe(3);
    });

    it('accepts a null description', () => {
        const parsed = RoleListResponseSchema.parse({
            ...listed,
            description: null,
        });

        expect(parsed.description).toBeNull();
    });

    it('rejects a policies array in place of the count', () => {
        expect(
            RoleListResponseSchema.safeParse({ ...listed, policies: [] })
                .success
        ).toBe(false);
    });
});
