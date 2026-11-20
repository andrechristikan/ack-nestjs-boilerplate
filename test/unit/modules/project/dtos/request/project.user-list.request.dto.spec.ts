import { ProjectUserListRequestSchema } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectDefaultAvailableSearch } from '@modules/project/constants/project.list.constant';
import { EnumProjectCursorOrderBy } from '@modules/project/enums/project.enum';

describe('ProjectUserListRequestSchema', () => {
    it('parses cursor, perPage, search, and a string orderBy', () => {
        const result = ProjectUserListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'revamp',
            orderBy: 'latest',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'revamp',
            orderBy: 'latest',
        });
    });

    it('parses an empty query', () => {
        const result = ProjectUserListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        const result = ProjectUserListRequestSchema.safeParse({ extra: true });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the module search description', () => {
        expect(
            ProjectUserListRequestSchema.shape.search.meta()?.description
        ).toContain(ProjectDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ProjectUserListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumProjectCursorOrderBy).join(', '));
    });

    it.each(Object.values(EnumProjectCursorOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                ProjectUserListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            ProjectUserListRequestSchema.safeParse({ orderBy: '' }).success
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
            ProjectUserListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ProjectUserListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
