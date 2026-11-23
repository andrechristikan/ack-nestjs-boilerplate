import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleRefResponseSchema } from '@modules/role/dtos/response/role.ref.response.dto';

describe('RoleRefResponseSchema', () => {
    const ref = {
        id: 'role-1',
        scope: EnumRoleScope.workspace,
        key: 'owner',
        name: 'Owner',
    };

    it('parses a role into its reference fields only', () => {
        const result = RoleRefResponseSchema.parse({
            ...ref,
            description: 'x',
            policyRevision: 2,
        });

        expect(result).toEqual(ref);
    });

    it('rejects a scope outside EnumRoleScope', () => {
        expect(() =>
            RoleRefResponseSchema.parse({ ...ref, scope: 'galaxy' })
        ).toThrow();
    });
});
