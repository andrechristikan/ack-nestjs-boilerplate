import { ProjectMemberListRequestSchema } from '@modules/project/dtos/request/project.member-list.request.dto';
import { EnumProjectMemberOrderBy } from '@modules/project/enums/project.enum';

describe('ProjectMemberListRequestSchema', () => {
    it('parses cursor, perPage, and a string orderBy', () => {
        const result = ProjectMemberListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
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

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ProjectMemberListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumProjectMemberOrderBy).join(', '));
    });

    it.each(Object.values(EnumProjectMemberOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                ProjectMemberListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            ProjectMemberListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'joinedAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            ProjectMemberListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ProjectMemberListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
