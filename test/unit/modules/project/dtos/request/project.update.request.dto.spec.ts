import { ProjectUpdateRequestSchema } from '@modules/project/dtos/request/project.update.request.dto';

describe('ProjectUpdateRequestSchema', () => {
    const payload = {
        name: 'Website Revamp',
        description: 'Marketing site redesign',
    };

    it('parses name and description', () => {
        const result = ProjectUpdateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a null description to clear it', () => {
        const result = ProjectUpdateRequestSchema.parse({
            ...payload,
            description: null,
        });

        expect(result).toEqual({ ...payload, description: null });
    });

    it('rejects an empty body', () => {
        expect(() => ProjectUpdateRequestSchema.parse({})).toThrow();
    });

    it('rejects a body missing the name', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({
                description: payload.description,
            })
        ).toThrow();
    });

    it('rejects a body missing the description', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ name: payload.name })
        ).toThrow();
    });

    it('rejects a null name', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ ...payload, name: null })
        ).toThrow();
    });

    it('rejects an empty name', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ ...payload, name: '' })
        ).toThrow();
    });

    it('rejects a name over 150 characters', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({
                ...payload,
                name: 'a'.repeat(151),
            })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({
                ...payload,
                description: 'a'.repeat(501),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectUpdateRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
