import { WorkspaceInviteListRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteDefaultAvailableSearch } from '@modules/workspace/constants/workspace.list.constant';
import { EnumWorkspaceInviteOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceInviteListRequestSchema', () => {
    it('parses cursor, perPage, search, orderBy, and status', () => {
        const result = WorkspaceInviteListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
            status: 'pending',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
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

    it('accepts a status of 256 characters and rejects one of 257', () => {
        expect(() =>
            WorkspaceInviteListRequestSchema.parse({ status: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            WorkspaceInviteListRequestSchema.parse({ status: 'a'.repeat(257) })
        ).toThrow();
    });

    it('keeps the module search description', () => {
        expect(
            WorkspaceInviteListRequestSchema.shape.search.meta()?.description
        ).toContain(WorkspaceInviteDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            WorkspaceInviteListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumWorkspaceInviteOrderBy).join(', '));
    });

    it.each(Object.values(EnumWorkspaceInviteOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                WorkspaceInviteListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            WorkspaceInviteListRequestSchema.safeParse({ orderBy: '' }).success
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
            WorkspaceInviteListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            WorkspaceInviteListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
