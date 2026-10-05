import { WorkspaceUserListRequestSchema } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';

describe('WorkspaceUserListRequestSchema', () => {
    it('parses cursor, perPage, search, and orderBy', () => {
        const result = WorkspaceUserListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceUserListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceUserListRequestSchema.parse({ extra: true })
        ).toThrow();
    });
});
