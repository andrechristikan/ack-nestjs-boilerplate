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
        const result = RoleCreateRequestSchema.safeParse({
            name: 'ab',
            type: EnumRoleType.admin,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name longer than 30 characters', () => {
        const result = RoleCreateRequestSchema.safeParse({
            name: 'a'.repeat(31),
            type: EnumRoleType.admin,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects a name with a non-alphanumeric character', () => {
        const result = RoleCreateRequestSchema.safeParse({
            name: 'team-lead',
            type: EnumRoleType.admin,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_format' }),
        ]);
    });

    it('rejects a missing name', () => {
        const result = RoleCreateRequestSchema.safeParse({
            type: EnumRoleType.admin,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = RoleCreateRequestSchema.safeParse({
            name: 'manager',
            type: EnumRoleType.admin,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects the superAdmin type', () => {
        expect(
            RoleCreateRequestSchema.safeParse({
                name: 'manager',
                type: EnumRoleType.superAdmin,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });
});
