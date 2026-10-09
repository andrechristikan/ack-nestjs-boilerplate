import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogAdminWorkspaceListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-workspace-list.request.dto';

describe('ActivityLogAdminWorkspaceListRequestSchema', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('parses the pagination fields and a user filter', () => {
        const result = ActivityLogAdminWorkspaceListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            userId,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            userId,
        });
    });

    it('parses with no field set', () => {
        const result = ActivityLogAdminWorkspaceListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a userId that is not a mongo id', () => {
        expect(() =>
            ActivityLogAdminWorkspaceListRequestSchema.parse({
                userId: 'not-an-id',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogAdminWorkspaceListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            ActivityLogAdminWorkspaceListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            ActivityLogAdminWorkspaceListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(ActivityLogDefaultAvailableOrderBy.join(', '));
    });
});
