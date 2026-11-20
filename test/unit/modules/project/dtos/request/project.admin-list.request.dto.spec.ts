import { ProjectAdminListRequestSchema } from '@modules/project/dtos/request/project.admin-list.request.dto';
import { ProjectDefaultAvailableSearch } from '@modules/project/constants/project.list.constant';
import { EnumProjectOrderBy } from '@modules/project/enums/project.enum';

describe('ProjectAdminListRequestSchema', () => {
    it('parses page, perPage, search, orderBy, and workspaceId', () => {
        const result = ProjectAdminListRequestSchema.parse({
            page: 1,
            perPage: 20,
            search: 'revamp',
            orderBy: 'latest',
            workspaceId: '507f1f77bcf86cd799439011',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            search: 'revamp',
            orderBy: 'latest',
            workspaceId: '507f1f77bcf86cd799439011',
        });
    });

    it('parses an empty query', () => {
        const result = ProjectAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a workspaceId that is not a MongoDB ObjectId', () => {
        const result = ProjectAdminListRequestSchema.safeParse({
            workspaceId: 'not-an-id',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'too_small',
            }),
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ProjectAdminListRequestSchema.safeParse({ extra: true });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the module search description', () => {
        expect(
            ProjectAdminListRequestSchema.shape.search.meta()?.description
        ).toContain(ProjectDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ProjectAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumProjectOrderBy).join(', '));
    });

    it.each(Object.values(EnumProjectOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                ProjectAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            ProjectAdminListRequestSchema.safeParse({ orderBy: '' }).success
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
            ProjectAdminListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ProjectAdminListRequestSchema.safeParse({
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
