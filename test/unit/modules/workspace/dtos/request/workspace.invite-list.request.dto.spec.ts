import { WorkspaceInviteListRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';

describe('WorkspaceInviteListRequestSchema', () => {
    it('parses cursor, perPage, search, orderBy, and status', () => {
        const result = WorkspaceInviteListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
            status: 'pending',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'createdAt:desc',
            status: 'pending',
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceInviteListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceInviteListRequestSchema.parse({ extra: true })
        ).toThrow();
    });
});
