import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleSystemListRequestSchema } from '@modules/role/dtos/request/role.system-list.request.dto';
import { RoleDefaultAvailableSearch } from '@modules/role/constants/role.list.constant';
import { EnumRoleOrderBy } from '@modules/role/enums/role.enum';

describe('RoleSystemListRequestSchema', () => {
    it('parses cursor, perPage, search, orderBy, and type', () => {
        const result = RoleSystemListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'lead',
            orderBy: 'latest',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'lead',
            orderBy: 'latest',
            type: EnumRoleType.admin,
        });
    });

    it('parses with no field set', () => {
        const result = RoleSystemListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        const result = RoleSystemListRequestSchema.safeParse({ extra: true });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a type of 256 characters and rejects one of 257', () => {
        expect(() =>
            RoleSystemListRequestSchema.parse({ type: 'a'.repeat(256) })
        ).not.toThrow();
        const result = RoleSystemListRequestSchema.safeParse({
            type: 'a'.repeat(257),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'too_big' }),
        ]);
    });

    it('keeps the module search description', () => {
        expect(
            RoleSystemListRequestSchema.shape.search.meta()?.description
        ).toContain(RoleDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            RoleSystemListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumRoleOrderBy).join(', '));
    });

    it.each(Object.values(EnumRoleOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                RoleSystemListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            RoleSystemListRequestSchema.safeParse({ orderBy: '' }).success
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
            RoleSystemListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            RoleSystemListRequestSchema.safeParse({
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
