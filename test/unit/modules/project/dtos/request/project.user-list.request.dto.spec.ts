import { ProjectUserListRequestSchema } from '@modules/project/dtos/request/project.user-list.request.dto';
import {
    ProjectDefaultAvailableSearch,
    ProjectCursorAvailableOrderBy,
} from '@modules/project/constants/project.list.constant';

describe('ProjectUserListRequestSchema', () => {
    it('parses cursor, perPage, search, and a string orderBy', () => {
        const result = ProjectUserListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'revamp',
            orderBy: 'name:asc',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'revamp',
            orderBy: 'name:asc',
        });
    });

    it('parses an array orderBy', () => {
        const result = ProjectUserListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'name:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'name:asc'] });
    });

    it('parses an empty query', () => {
        const result = ProjectUserListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectUserListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            ProjectUserListRequestSchema.shape.search.meta()?.description
        ).toContain(ProjectDefaultAvailableSearch.join(', '));
        expect(
            ProjectUserListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(ProjectCursorAvailableOrderBy.join(', '));
    });
});
