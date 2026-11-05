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

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            ProjectUserListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single orderBy built from the allow-list', () => {
        const first = ProjectCursorAvailableOrderBy[0];

        expect(
            ProjectUserListRequestSchema.safeParse({ orderBy: `${first}:asc` })
                .success
        ).toBe(true);
    });

    it('rejects a repeated orderBy built from the allow-list', () => {
        const first = ProjectCursorAvailableOrderBy[0];
        const last =
            ProjectCursorAvailableOrderBy[
                ProjectCursorAvailableOrderBy.length - 1
            ];

        expect(
            ProjectUserListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(false);
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
