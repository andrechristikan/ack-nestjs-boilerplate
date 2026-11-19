import { WorkspaceMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import { EnumWorkspaceMemberOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceMemberListRequestSchema', () => {
    it('parses cursor, perPage, orderBy, and role', () => {
        const result = WorkspaceMemberListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
            role: 'admin',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
            role: 'admin',
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceMemberListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceMemberListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            WorkspaceMemberListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('accepts a role of 256 characters and rejects one of 257', () => {
        expect(() =>
            WorkspaceMemberListRequestSchema.parse({ role: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            WorkspaceMemberListRequestSchema.parse({ role: 'a'.repeat(257) })
        ).toThrow();
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            WorkspaceMemberListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumWorkspaceMemberOrderBy).join(', '));
    });

    it.each(Object.values(EnumWorkspaceMemberOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                WorkspaceMemberListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            WorkspaceMemberListRequestSchema.safeParse({ orderBy: '' }).success
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
            WorkspaceMemberListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            WorkspaceMemberListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
