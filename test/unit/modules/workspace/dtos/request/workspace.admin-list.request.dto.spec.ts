import { WorkspaceAdminListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceDefaultAvailableSearch } from '@modules/workspace/constants/workspace.list.constant';
import { EnumWorkspaceOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceAdminListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, and isPublic', () => {
        const result = WorkspaceAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
            isPublic: 'true',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
            isPublic: true,
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces the isPublic boolean string', () => {
        const result = WorkspaceAdminListRequestSchema.parse({
            isPublic: 'false',
        });

        expect(result).toEqual({ isPublic: false });
    });

    it('rejects an isPublic value that is not exactly true or false', () => {
        expect(() =>
            WorkspaceAdminListRequestSchema.parse({ isPublic: 'yes' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceAdminListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search description', () => {
        expect(
            WorkspaceAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(WorkspaceDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            WorkspaceAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumWorkspaceOrderBy).join(', '));
    });

    it.each(Object.values(EnumWorkspaceOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                WorkspaceAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            WorkspaceAdminListRequestSchema.safeParse({ orderBy: '' }).success
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
            WorkspaceAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            WorkspaceAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
