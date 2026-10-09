import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';
import { ProjectMemberListRequestSchema } from '@modules/project/dtos/request/project.member-list.request.dto';

describe('ProjectMemberListRequestSchema', () => {
    it('parses cursor, perPage, and a string orderBy', () => {
        const result = ProjectMemberListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses an array orderBy', () => {
        const result = ProjectMemberListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'joinedAt:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'joinedAt:asc'] });
    });

    it('parses an empty query', () => {
        const result = ProjectMemberListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectMemberListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            ProjectMemberListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            ProjectMemberListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(ProjectMemberDefaultAvailableOrderBy.join(', '));
    });
});
