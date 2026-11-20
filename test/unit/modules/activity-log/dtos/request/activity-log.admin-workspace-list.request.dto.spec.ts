import { ActivityLogAdminWorkspaceListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-workspace-list.request.dto';
import { EnumActivityLogOrderBy } from '@modules/activity-log/enums/activity-log.enum';

describe('ActivityLogAdminWorkspaceListRequestSchema', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('parses the pagination fields and a user filter', () => {
        const result = ActivityLogAdminWorkspaceListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
            userId,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'latest',
            userId,
        });
    });

    it('parses with no field set', () => {
        const result = ActivityLogAdminWorkspaceListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a userId that is not a mongo id', () => {
        const result = ActivityLogAdminWorkspaceListRequestSchema.safeParse({
            userId: 'not-an-id',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['userId'], code: 'too_small' }),
            expect.objectContaining({
                path: ['userId'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogAdminWorkspaceListRequestSchema.safeParse({
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            ActivityLogAdminWorkspaceListRequestSchema.safeParse({
                search: 'x',
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ActivityLogAdminWorkspaceListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumActivityLogOrderBy).join(', '));
    });

    it.each(Object.values(EnumActivityLogOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                ActivityLogAdminWorkspaceListRequestSchema.safeParse({
                    orderBy,
                }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            ActivityLogAdminWorkspaceListRequestSchema.safeParse({
                orderBy: '',
            }).success
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
            ActivityLogAdminWorkspaceListRequestSchema.safeParse({ orderBy })
                .error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ActivityLogAdminWorkspaceListRequestSchema.safeParse({
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
