import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleSharedListRequestSchema } from '@modules/role/dtos/request/role.shared-list.request.dto';

describe('RoleSharedListRequestSchema', () => {
    it.each([EnumRoleScope.workspace, EnumRoleScope.project])(
        'accepts the catalog scope %s',
        scope => {
            const result = RoleSharedListRequestSchema.parse({ scope });

            expect(result.scope).toBe(scope);
        }
    );

    it('rejects the platform scope, it is not a catalog', () => {
        expect(() =>
            RoleSharedListRequestSchema.parse({ scope: EnumRoleScope.platform })
        ).toThrow();
    });

    it('requires the scope', () => {
        expect(() => RoleSharedListRequestSchema.parse({})).toThrow();
    });

    it('accepts the cursor order field and rejects an offset-only one', () => {
        expect(
            RoleSharedListRequestSchema.parse({
                scope: EnumRoleScope.workspace,
                orderBy: 'createdAt:desc',
            }).orderBy
        ).toBe('createdAt:desc');
        expect(() =>
            RoleSharedListRequestSchema.parse({
                scope: EnumRoleScope.workspace,
                orderBy: 'name:asc',
            })
        ).toThrow();
    });
});
