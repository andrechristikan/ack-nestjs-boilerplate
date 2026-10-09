import { WorkspaceJoinRequestDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import { WorkspaceJoinRequestListRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';

describe('WorkspaceJoinRequestListRequestSchema', () => {
    it('parses cursor, perPage, orderBy, and status', () => {
        const result = WorkspaceJoinRequestListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
            status: 'pending',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
            status: 'pending',
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceJoinRequestListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceJoinRequestListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(WorkspaceJoinRequestDefaultAvailableOrderBy.join(', '));
    });
});
