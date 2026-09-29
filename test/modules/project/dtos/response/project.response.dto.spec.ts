import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';

describe('ProjectResponseSchema', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-01-03T03:04:05.000Z');

    const row = {
        id: '507f1f77bcf86cd799439011',
        createdAt,
        createdBy: '507f1f77bcf86cd799439012',
        updatedAt,
        updatedBy: '507f1f77bcf86cd799439012',
        deletedAt: null,
        deletedBy: null,
        workspaceId: '507f1f77bcf86cd799439013',
        name: 'Website Revamp',
        slug: 'website-revamp',
        description: 'Marketing site redesign',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = ProjectResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null description', () => {
        const result = ProjectResponseSchema.parse({
            ...row,
            description: null,
        });

        expect(result).toEqual({ ...row, description: null });
    });

    it('strips an undeclared key', () => {
        const result = ProjectResponseSchema.parse({
            ...row,
            internalNote: 'hidden',
        });

        expect(result).toEqual(row);
    });

    it('rejects a createdAt that is not a Date', () => {
        expect(() =>
            ProjectResponseSchema.parse({
                ...row,
                createdAt: createdAt.toISOString(),
            })
        ).toThrow();
    });

    it('rejects a missing description', () => {
        const { description: _description, ...rest } = row;

        expect(() => ProjectResponseSchema.parse(rest)).toThrow();
    });
});
