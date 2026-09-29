import { WorkspaceAdminListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';

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
});
