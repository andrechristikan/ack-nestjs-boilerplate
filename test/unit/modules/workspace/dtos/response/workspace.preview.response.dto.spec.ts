import { WorkspacePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.preview.response.dto';

describe('WorkspacePreviewResponseSchema', () => {
    const row = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        deletedAt: null,
        name: 'Acme',
        slug: 'acme-team',
        description: 'Our team workspace',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = WorkspacePreviewResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips audit columns naming a user', () => {
        const result = WorkspacePreviewResponseSchema.parse({
            ...row,
            createdBy: 'user-1',
            updatedBy: 'user-1',
            deletedBy: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
