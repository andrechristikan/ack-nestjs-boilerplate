import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

describe('RoleUpdateRequestSchema', () => {
    it('parses description and type into exactly the declared fields', () => {
        const result = RoleUpdateRequestSchema.parse({
            description: 'Team lead role',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            description: 'Team lead role',
            type: EnumRoleType.admin,
        });
    });

    it('parses with only the required type', () => {
        const result = RoleUpdateRequestSchema.parse({
            type: EnumRoleType.user,
        });

        expect(result).toEqual({ type: EnumRoleType.user });
    });

    it('rejects a missing type', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({ description: 'Team lead role' })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({
                description: 'a'.repeat(501),
                type: EnumRoleType.admin,
            })
        ).toThrow();
    });

    it('rejects an invalid type', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({ type: 'invalid' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({
                type: EnumRoleType.admin,
                extra: true,
            })
        ).toThrow();
    });
});
