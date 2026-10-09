import { WorkspaceAdminListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import {
    WorkspaceDefaultAvailableSearch,
    WorkspaceDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';

describe('WorkspaceAdminListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, and isPublic', () => {
        const result = WorkspaceAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
            isPublic: 'true',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
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

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            WorkspaceAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(WorkspaceDefaultAvailableSearch.join(', '));
        expect(
            WorkspaceAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(WorkspaceDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            WorkspaceAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = WorkspaceDefaultAvailableOrderBy[0];
        const last =
            WorkspaceDefaultAvailableOrderBy[
                WorkspaceDefaultAvailableOrderBy.length - 1
            ];

        expect(
            WorkspaceAdminListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            WorkspaceAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${WorkspaceDefaultAvailableOrderBy[0]}:`,
        `${WorkspaceDefaultAvailableOrderBy[0]}:DESC`,
        `${WorkspaceDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            WorkspaceAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
