import { WorkspaceAdminMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';

describe('WorkspaceAdminMemberListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = WorkspaceAdminMemberListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'joinedAt:desc',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'joinedAt:desc',
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceAdminMemberListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceAdminMemberListRequestSchema.parse({ extra: true })
        ).toThrow();
    });
});
