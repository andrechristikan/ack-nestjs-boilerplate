import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleAdminListRequestSchema } from '@modules/role/dtos/request/role.admin-list.request.dto';
import {
    RoleDefaultAvailableSearch,
    RoleDefaultAvailableOrderBy,
} from '@modules/role/constants/role.list.constant';

describe('RoleAdminListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, and type', () => {
        const result = RoleAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'lead',
            orderBy: 'createdAt:desc',
            type: EnumRoleType.admin,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'lead',
            orderBy: 'createdAt:desc',
            type: EnumRoleType.admin,
        });
    });

    it('parses with no field set', () => {
        const result = RoleAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            RoleAdminListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            RoleAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(RoleDefaultAvailableSearch.join(', '));
        expect(
            RoleAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(RoleDefaultAvailableOrderBy.join(', '));
    });
});
