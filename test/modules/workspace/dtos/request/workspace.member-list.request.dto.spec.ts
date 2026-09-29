import { WorkspaceMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';

describe('WorkspaceMemberListRequestSchema', () => {
    it('parses cursor, perPage, orderBy, and role', () => {
        const result = WorkspaceMemberListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'joinedAt:desc',
            role: 'admin',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'joinedAt:desc',
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
});
