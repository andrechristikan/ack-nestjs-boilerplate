import { WorkspaceInviteListRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';

describe('WorkspaceInviteListRequestSchema', () => {
    it('accepts cursor pagination, order, search, and status filters', () => {
        const input = {
            cursor: '507f1f77bcf86cd799439011',
            perPage: 20,
            orderBy: ['createdAt:desc', 'email:asc'],
            search: 'member',
            status: 'pending,accepted',
        };

        expect(WorkspaceInviteListRequestSchema.parse(input)).toEqual(input);
    });

    it('rejects unknown query keys', () => {
        expect(
            WorkspaceInviteListRequestSchema.safeParse({ unknown: true })
                .success
        ).toBe(false);
    });

    it.each([{ perPage: 0 }, { perPage: 101 }, { cursor: '' }])(
        'accepts integer and string boundary values without range constraints',
        input => {
            expect(
                WorkspaceInviteListRequestSchema.safeParse(input).success
            ).toBe(true);
        }
    );

    it('rejects a fractional page size', () => {
        expect(
            WorkspaceInviteListRequestSchema.safeParse({ perPage: 1.5 }).success
        ).toBe(false);
    });
});
