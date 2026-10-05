import { ProjectCreateRequestSchema } from '@modules/project/dtos/request/project.create.request.dto';

describe('ProjectCreateRequestSchema', () => {
    it('parses name and description', () => {
        const result = ProjectCreateRequestSchema.parse({
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        });

        expect(result).toEqual({
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        });
    });

    it('parses with description omitted', () => {
        const result = ProjectCreateRequestSchema.parse({
            name: 'Website Revamp',
        });

        expect(result).toEqual({ name: 'Website Revamp' });
    });

    it('rejects an empty name', () => {
        expect(() => ProjectCreateRequestSchema.parse({ name: '' })).toThrow();
    });

    it('rejects a name over 150 characters', () => {
        expect(() =>
            ProjectCreateRequestSchema.parse({ name: 'a'.repeat(151) })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            ProjectCreateRequestSchema.parse({
                name: 'Website Revamp',
                description: 'a'.repeat(501),
            })
        ).toThrow();
    });

    it('rejects a missing name', () => {
        expect(() => ProjectCreateRequestSchema.parse({})).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectCreateRequestSchema.parse({
                name: 'Website Revamp',
                extra: true,
            })
        ).toThrow();
    });
});
