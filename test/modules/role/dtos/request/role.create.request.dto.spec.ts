import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleCreateRequestSchema } from '@modules/role/dtos/request/role.create.request.dto';

describe('RoleCreateRequestSchema', () => {
    it('parses name, description, and type into exactly the declared fields', () => {
        const result = RoleCreateRequestSchema.parse({
            name: 'manager',
            description: 'Team lead role',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            name: 'manager',
            description: 'Team lead role',
            type: EnumRoleType.admin,
        });
    });

    it('trims and lowercases the name', () => {
        const result = RoleCreateRequestSchema.parse({
            name: '  Manager  ',
            type: EnumRoleType.admin,
        });

        expect(result.name).toBe('manager');
    });

    it('rejects a name shorter than 3 characters', () => {
        expect(() =>
            RoleCreateRequestSchema.parse({
                name: 'ab',
                type: EnumRoleType.admin,
            })
        ).toThrow();
    });

    it('rejects a name longer than 30 characters', () => {
        expect(() =>
            RoleCreateRequestSchema.parse({
                name: 'a'.repeat(31),
                type: EnumRoleType.admin,
            })
        ).toThrow();
    });

    it('rejects a name with a non-alphanumeric character', () => {
        expect(() =>
            RoleCreateRequestSchema.parse({
                name: 'team-lead',
                type: EnumRoleType.admin,
            })
        ).toThrow();
    });

    it('rejects a missing name', () => {
        expect(() =>
            RoleCreateRequestSchema.parse({ type: EnumRoleType.admin })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            RoleCreateRequestSchema.parse({
                name: 'manager',
                type: EnumRoleType.admin,
                extra: true,
            })
        ).toThrow();
    });
});
