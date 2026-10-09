import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';
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

    it('rejects search', () => {
        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            WorkspaceAdminMemberListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(WorkspaceMemberDefaultAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = WorkspaceMemberDefaultAvailableOrderBy[0];
        const last =
            WorkspaceMemberDefaultAvailableOrderBy[
                WorkspaceMemberDefaultAvailableOrderBy.length - 1
            ];

        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${WorkspaceMemberDefaultAvailableOrderBy[0]}:`,
        `${WorkspaceMemberDefaultAvailableOrderBy[0]}:DESC`,
        `${WorkspaceMemberDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
