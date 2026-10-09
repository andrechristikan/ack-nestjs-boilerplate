import { WorkspaceUpdateRequestSchema } from '@modules/workspace/dtos/request/workspace.update.request.dto';

describe('WorkspaceUpdateRequestSchema', () => {
    const payload = { name: 'Acme', description: 'Our team workspace' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceUpdateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a null description to clear it', () => {
        const result = WorkspaceUpdateRequestSchema.parse({
            ...payload,
            description: null,
        });

        expect(result).toEqual({ ...payload, description: null });
    });

    it('rejects a body missing the name', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({
                description: payload.description,
            })
        ).toThrow();
    });

    it('rejects a body missing the description', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({ name: payload.name })
        ).toThrow();
    });

    it('rejects a null name', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({ ...payload, name: null })
        ).toThrow();
    });

    it('rejects an empty name', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({ ...payload, name: '' })
        ).toThrow();
    });

    it('rejects a name over 150 characters', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({
                ...payload,
                name: 'a'.repeat(151),
            })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({
                ...payload,
                description: 'a'.repeat(501),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
