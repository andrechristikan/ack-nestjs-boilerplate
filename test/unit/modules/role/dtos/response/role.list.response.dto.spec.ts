import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';

describe('RoleListResponseSchema', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const row = {
        id: 'role-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        name: 'manager',
        type: EnumRoleType.admin,
        policies: 3,
    };

    it('parses a row into exactly the declared fields, policies as a count', () => {
        const result = RoleListResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips description and any other undeclared key', () => {
        const result = RoleListResponseSchema.parse({
            ...row,
            description: 'Team lead role',
        });

        expect(result).toEqual(row);
    });

    it('rejects a non-number policies count', () => {
        expect(() =>
            RoleListResponseSchema.parse({ ...row, policies: [] })
        ).toThrow();
    });
});
