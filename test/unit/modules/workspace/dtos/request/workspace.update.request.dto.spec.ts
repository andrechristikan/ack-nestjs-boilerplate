import { WorkspaceUpdateRequestSchema } from '@modules/workspace/dtos/request/workspace.update.request.dto';

describe('WorkspaceUpdateRequestSchema', () => {
    const payload = { name: 'Acme', description: 'Our team workspace' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceUpdateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with no field set', () => {
        const result = WorkspaceUpdateRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a name over 150 characters', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({ name: 'a'.repeat(151) })
        ).toThrow();
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            WorkspaceUpdateRequestSchema.parse({
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
