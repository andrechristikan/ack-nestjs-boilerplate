import { ProjectUpdateRequestSchema } from '@modules/project/dtos/request/project.update.request.dto';

describe('ProjectUpdateRequestSchema', () => {
    it('parses name and description', () => {
        const result = ProjectUpdateRequestSchema.parse({
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        });

        expect(result).toEqual({
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        });
    });

    it('parses an empty body; both fields are optional', () => {
        const result = ProjectUpdateRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a name over 150 characters', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ name: 'a'.repeat(151) })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ description: 'a'.repeat(501) })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ extra: true })
        ).toThrow();
    });
});
