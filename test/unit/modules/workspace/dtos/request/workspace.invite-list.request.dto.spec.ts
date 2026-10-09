import { WorkspaceInviteListRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import {
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';

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

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            WorkspaceInviteListRequestSchema.shape.search.meta()?.description
        ).toContain(WorkspaceInviteDefaultAvailableSearch.join(', '));
        expect(
            WorkspaceInviteListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(WorkspaceInviteDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            WorkspaceInviteListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = WorkspaceInviteDefaultAvailableOrderBy[0];
        const last =
            WorkspaceInviteDefaultAvailableOrderBy[
                WorkspaceInviteDefaultAvailableOrderBy.length - 1
            ];

        expect(
            WorkspaceInviteListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            WorkspaceInviteListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${WorkspaceInviteDefaultAvailableOrderBy[0]}:`,
        `${WorkspaceInviteDefaultAvailableOrderBy[0]}:DESC`,
        `${WorkspaceInviteDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            WorkspaceInviteListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
