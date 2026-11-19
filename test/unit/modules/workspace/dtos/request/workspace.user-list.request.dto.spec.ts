import { WorkspaceUserListRequestSchema } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceDefaultAvailableSearch } from '@modules/workspace/constants/workspace.list.constant';
import { EnumWorkspaceCursorOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceUserListRequestSchema', () => {
    it('parses cursor, perPage, search, and orderBy', () => {
        const result = WorkspaceUserListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'acme',
            orderBy: 'latest',
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

    it('keeps the module search description', () => {
        expect(
            WorkspaceUserListRequestSchema.shape.search.meta()?.description
        ).toContain(WorkspaceDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            WorkspaceUserListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumWorkspaceCursorOrderBy).join(', '));
    });

    it.each(Object.values(EnumWorkspaceCursorOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                WorkspaceUserListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            WorkspaceUserListRequestSchema.safeParse({ orderBy: '' }).success
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
            WorkspaceUserListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            WorkspaceUserListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
