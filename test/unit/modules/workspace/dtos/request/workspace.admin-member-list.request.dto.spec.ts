import { WorkspaceAdminMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import { EnumWorkspaceMemberOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceAdminMemberListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = WorkspaceAdminMemberListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            WorkspaceAdminMemberListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumWorkspaceMemberOrderBy).join(', '));
    });

    it.each(Object.values(EnumWorkspaceMemberOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                WorkspaceAdminMemberListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'joinedAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            WorkspaceAdminMemberListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
