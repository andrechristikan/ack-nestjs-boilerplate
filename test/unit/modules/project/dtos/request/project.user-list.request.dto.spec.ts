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
            orderBy: `${ProjectCursorAvailableOrderBy[0]}:asc`,
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            search: 'revamp',
            orderBy: `${ProjectCursorAvailableOrderBy[0]}:asc`,
        });
    });

    it('parses an array orderBy', () => {
        const result = ProjectUserListRequestSchema.parse({
            orderBy: [
                `${ProjectCursorAvailableOrderBy[0]}:desc`,
                `${ProjectCursorAvailableOrderBy[0]}:asc`,
            ],
        });

        expect(result).toEqual({
            orderBy: [
                `${ProjectCursorAvailableOrderBy[0]}:desc`,
                `${ProjectCursorAvailableOrderBy[0]}:asc`,
            ],
        });
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

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = ProjectCursorAvailableOrderBy[0];
        const last =
            ProjectCursorAvailableOrderBy[
                ProjectCursorAvailableOrderBy.length - 1
            ];

        expect(
            ProjectUserListRequestSchema.safeParse({ orderBy: `${first}:asc` })
                .success
        ).toBe(true);
        expect(
            ProjectUserListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${ProjectCursorAvailableOrderBy[0]}:`,
        `${ProjectCursorAvailableOrderBy[0]}:DESC`,
        `${ProjectCursorAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            ProjectUserListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
