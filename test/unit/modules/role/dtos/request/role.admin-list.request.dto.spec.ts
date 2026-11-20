import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleAdminListRequestSchema } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { RoleDefaultAvailableSearch } from '@modules/role/constants/role.list.constant';
import { EnumRoleOrderBy } from '@modules/role/enums/role.enum';

describe('RoleAdminListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, and type', () => {
        const result = RoleAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'lead',
            orderBy: 'latest',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'lead',
            orderBy: 'latest',
            type: EnumRoleType.admin,
        });
    });

    it('parses with no field set', () => {
        const result = RoleAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        const result = RoleAdminListRequestSchema.safeParse({ extra: true });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a type of 256 characters and rejects one of 257', () => {
        expect(() =>
            RoleAdminListRequestSchema.parse({ type: 'a'.repeat(256) })
        ).not.toThrow();
        const result = RoleAdminListRequestSchema.safeParse({
            type: 'a'.repeat(257),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'too_big' }),
        ]);
    });

    it('keeps the module search description', () => {
        expect(
            RoleAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(RoleDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            RoleAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumRoleOrderBy).join(', '));
    });

    it.each(Object.values(EnumRoleOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                RoleAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            RoleAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            RoleAdminListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            RoleAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
