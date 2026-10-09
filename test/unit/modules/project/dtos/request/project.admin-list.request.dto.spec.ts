import { ProjectAdminListRequestSchema } from '@modules/project/dtos/request/project.admin-list.request.dto';
import {
    ProjectDefaultAvailableSearch,
    ProjectDefaultAvailableOrderBy,
} from '@modules/project/constants/project.list.constant';

describe('ProjectAdminListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, and workspaceId', () => {
        const result = ProjectAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'revamp',
            orderBy: 'createdAt:desc',
            workspaceId: '507f1f77bcf86cd799439011',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'revamp',
            orderBy: 'createdAt:desc',
            workspaceId: '507f1f77bcf86cd799439011',
        });
    });

    it('parses an array orderBy', () => {
        const result = ProjectAdminListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'name:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'name:asc'] });
    });

    it('parses an empty query', () => {
        const result = ProjectAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a workspaceId that is not a MongoDB ObjectId', () => {
        expect(() =>
            ProjectAdminListRequestSchema.parse({ workspaceId: 'not-an-id' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectAdminListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            ProjectAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(ProjectDefaultAvailableSearch.join(', '));
        expect(
            ProjectAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(ProjectDefaultAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = ProjectDefaultAvailableOrderBy[0];
        const last =
            ProjectDefaultAvailableOrderBy[
                ProjectDefaultAvailableOrderBy.length - 1
            ];

        expect(
            ProjectAdminListRequestSchema.safeParse({ orderBy: `${first}:asc` })
                .success
        ).toBe(true);
        expect(
            ProjectAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${ProjectDefaultAvailableOrderBy[0]}:`,
        `${ProjectDefaultAvailableOrderBy[0]}:DESC`,
        `${ProjectDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            ProjectAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
