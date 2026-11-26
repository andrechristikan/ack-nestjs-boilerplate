import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

describe('RoleUpdateRequestSchema', () => {
    it('parses description and type into exactly the declared fields', () => {
        const result = RoleUpdateRequestSchema.parse({
            description: 'team lead role',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            description: 'team lead role',
            type: EnumRoleType.admin,
        });
    });

    it('parses a null description to clear it', () => {
        const result = RoleUpdateRequestSchema.parse({
            description: null,
            type: EnumRoleType.user,
        });

        expect(result).toEqual({ description: null, type: EnumRoleType.user });
    });

    it('rejects a body missing the description', () => {
        const result = RoleUpdateRequestSchema.safeParse({
            type: EnumRoleType.user,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['description'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a missing type', () => {
        const result = RoleUpdateRequestSchema.safeParse({
            description: 'Team lead role',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('rejects a description over 500 characters', () => {
        const result = RoleUpdateRequestSchema.safeParse({
            description: 'a'.repeat(501),
            type: EnumRoleType.admin,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['description'], code: 'too_big' }),
        ]);
    });

    it('rejects an invalid type', () => {
        const result = RoleUpdateRequestSchema.safeParse({
            description: 'Team lead role',
            type: 'invalid',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = RoleUpdateRequestSchema.safeParse({
            description: 'Team lead role',
            type: EnumRoleType.admin,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects the superAdmin type', () => {
        expect(
            RoleUpdateRequestSchema.safeParse({
                description: 'Team lead role',
                type: EnumRoleType.superAdmin,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('trims and lower-cases the description', () => {
        const result = RoleUpdateRequestSchema.parse({
            description: '  Team LEAD role  ',
            type: EnumRoleType.admin,
        });

        expect(result.description).toBe('team lead role');
    });
});
