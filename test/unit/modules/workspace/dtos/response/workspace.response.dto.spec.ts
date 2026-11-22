import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';

describe('WorkspaceResponseSchema', () => {
    const row = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: 'Our team workspace',
        isPublic: false,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = WorkspaceResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('allows a null description', () => {
        const result = WorkspaceResponseSchema.parse({
            ...row,
            description: null,
        });

        expect(result.description).toBeNull();
    });

    it('strips an undeclared key', () => {
        const result = WorkspaceResponseSchema.parse({
            ...row,
            secret: 'hidden',
        });

        expect(result).toEqual(row);
    });
});
