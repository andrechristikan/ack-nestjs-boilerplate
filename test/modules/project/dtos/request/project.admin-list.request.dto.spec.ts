import { ProjectAdminListRequestSchema } from '@modules/project/dtos/request/project.admin-list.request.dto';

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
});
