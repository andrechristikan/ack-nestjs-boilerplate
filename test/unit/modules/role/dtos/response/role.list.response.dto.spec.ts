import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';

describe('RoleListResponseSchema', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const row = {
        id: 'role-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt: createdAt,
        updatedBy: 'user-1',
        scope: EnumRoleScope.platform,
        key: 'admin',
        name: 'Admin',
        policyRevision: 1,
        policies: 3,
    };

    it('parses a row with the policy count in place of the policies', () => {
        expect(RoleListResponseSchema.parse(row)).toEqual(row);
    });

    it('rejects a policy list where the count belongs', () => {
        expect(() =>
            RoleListResponseSchema.parse({ ...row, policies: [] })
        ).toThrow();
    });
});
