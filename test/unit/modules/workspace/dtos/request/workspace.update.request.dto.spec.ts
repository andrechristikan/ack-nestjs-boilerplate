import { WorkspaceUpdateRequestSchema } from '@modules/workspace/dtos/request/workspace.update.request.dto';

describe('WorkspaceUpdateRequestSchema', () => {
    const payload = { name: 'acme', description: 'our team workspace' };

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
        const result = WorkspaceUpdateRequestSchema.safeParse({
            description: payload.description,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a body missing the description', () => {
        const result = WorkspaceUpdateRequestSchema.safeParse({
            name: payload.name,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['description'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a null name', () => {
        const result = WorkspaceUpdateRequestSchema.safeParse({
            ...payload,
            name: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an empty name', () => {
        const result = WorkspaceUpdateRequestSchema.safeParse({
            ...payload,
            name: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name over 150 characters', () => {
        const result = WorkspaceUpdateRequestSchema.safeParse({
            ...payload,
            name: 'a'.repeat(151),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects a description over 500 characters', () => {
        const result = WorkspaceUpdateRequestSchema.safeParse({
            ...payload,
            description: 'a'.repeat(501),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['description'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceUpdateRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('trims and lower-cases name and description and rejects a whitespace-only name', () => {
        expect(
            WorkspaceUpdateRequestSchema.parse({
                name: ' Acme Team ',
                description: '  Our TEAM  ',
            })
        ).toEqual({ name: 'acme team', description: 'our team' });
        expect(
            WorkspaceUpdateRequestSchema.safeParse({ ...payload, name: '   ' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });
});
