import { WorkspaceJoinRequestListRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';

describe('WorkspaceJoinRequestListRequestSchema', () => {
    it('accepts cursor pagination, order, and status filters', () => {
        const input = {
            cursor: '507f1f77bcf86cd799439011',
            perPage: 20,
            orderBy: 'createdAt:desc',
            status: 'pending',
        };

        expect(WorkspaceJoinRequestListRequestSchema.parse(input)).toEqual(
            input
        );
    });

    it('rejects unknown query keys', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.safeParse({ unknown: true })
                .success
        ).toBe(false);
    });

    it.each([{ perPage: 0 }, { perPage: 101 }, { cursor: '' }])(
        'accepts integer and string boundary values without range constraints',
        input => {
            expect(
                WorkspaceJoinRequestListRequestSchema.safeParse(input).success
            ).toBe(true);
        }
    );

    it('rejects a fractional page size', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.safeParse({ perPage: 1.5 })
                .success
        ).toBe(false);
    });
});
