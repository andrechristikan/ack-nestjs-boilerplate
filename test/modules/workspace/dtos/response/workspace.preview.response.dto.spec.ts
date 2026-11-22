import { WorkspacePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
describe('WorkspacePreviewResponseSchema', () => {
    it('strips actor audit fields from the public workspace preview', () => {
        const now = new Date();
        const result = WorkspacePreviewResponseSchema.parse({
            id: 'id',
            name: 'Workspace',
            slug: 'workspace',
            description: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            createdBy: 'user-id',
            updatedBy: 'user-id',
            deletedBy: 'user-id',
        });
        expect(result).not.toHaveProperty('createdBy');
        expect(result.description).toBeNull();
    });
});
