import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';
import { ProjectMemberListRequestSchema } from '@modules/project/dtos/request/project.member-list.request.dto';

describe('ProjectMemberListRequestSchema', () => {
    it('parses cursor, perPage, and a string orderBy', () => {
        const result = ProjectMemberListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: `${ProjectMemberDefaultAvailableOrderBy[0]}:desc`,
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: `${ProjectMemberDefaultAvailableOrderBy[0]}:desc`,
        });
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

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            ProjectMemberListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single orderBy built from the allow-list', () => {
        const first = ProjectMemberDefaultAvailableOrderBy[0];

        expect(
            ProjectMemberListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
    });

    it('rejects a repeated orderBy built from the allow-list', () => {
        const first = ProjectMemberDefaultAvailableOrderBy[0];
        const last =
            ProjectMemberDefaultAvailableOrderBy[
                ProjectMemberDefaultAvailableOrderBy.length - 1
            ];

        expect(
            ProjectMemberListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(false);
    });

    it.each([
        'unknownField:asc',
        `${ProjectMemberDefaultAvailableOrderBy[0]}:`,
        `${ProjectMemberDefaultAvailableOrderBy[0]}:DESC`,
        `${ProjectMemberDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            ProjectMemberListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
