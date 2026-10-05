import { WorkspaceCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.create.request.dto';

describe('WorkspaceCreateRequestSchema', () => {
    const payload = {
        name: 'Acme',
        description: 'Our team workspace',
        isPublic: false,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceCreateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with only the required name', () => {
        const result = WorkspaceCreateRequestSchema.parse({ name: 'Acme' });

        expect(result).toEqual({ name: 'Acme' });
    });

    it('rejects an empty name', () => {
        expect(() =>
            WorkspaceCreateRequestSchema.parse({ ...payload, name: '' })
        ).toThrow();
    });

    it('rejects a name over 150 characters', () => {
        expect(() =>
            WorkspaceCreateRequestSchema.parse({
                ...payload,
                name: 'a'.repeat(151),
            })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            WorkspaceCreateRequestSchema.parse({
                ...payload,
                description: 'a'.repeat(501),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceCreateRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
