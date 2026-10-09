import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleSystemListRequestSchema } from '@modules/role/dtos/request/role.system-list.request.dto';
import {
    RoleDefaultAvailableSearch,
    RoleDefaultAvailableOrderBy,
} from '@modules/role/constants/role.list.constant';

describe('RoleSystemListRequestSchema', () => {
    it('parses cursor, perPage, search, orderBy, and type', () => {
        const result = RoleSystemListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'lead',
            orderBy: 'createdAt:desc',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'lead',
            orderBy: 'createdAt:desc',
            type: EnumRoleType.admin,
        });
    });

    it('parses with no field set', () => {
        const result = RoleSystemListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            RoleSystemListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            RoleSystemListRequestSchema.shape.search.meta()?.description
        ).toContain(RoleDefaultAvailableSearch.join(', '));
        expect(
            RoleSystemListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(RoleDefaultAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = RoleDefaultAvailableOrderBy[0];
        const last =
            RoleDefaultAvailableOrderBy[RoleDefaultAvailableOrderBy.length - 1];

        expect(
            RoleSystemListRequestSchema.safeParse({ orderBy: `${first}:asc` })
                .success
        ).toBe(true);
        expect(
            RoleSystemListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${RoleDefaultAvailableOrderBy[0]}:`,
        `${RoleDefaultAvailableOrderBy[0]}:DESC`,
        `${RoleDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(RoleSystemListRequestSchema.safeParse({ orderBy }).success).toBe(
            false
        );
    });
});
