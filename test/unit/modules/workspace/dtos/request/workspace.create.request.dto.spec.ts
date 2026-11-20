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
        const result = WorkspaceCreateRequestSchema.safeParse({
            ...payload,
            name: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name over 150 characters', () => {
        const result = WorkspaceCreateRequestSchema.safeParse({
            ...payload,
            name: 'a'.repeat(151),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects a description over 500 characters', () => {
        const result = WorkspaceCreateRequestSchema.safeParse({
            ...payload,
            description: 'a'.repeat(501),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['description'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceCreateRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
