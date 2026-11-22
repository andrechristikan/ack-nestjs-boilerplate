import { WorkspaceSlugRequestSchema } from '@modules/workspace/dtos/request/workspace.slug.request.dto';

describe('WorkspaceSlugRequestSchema', () => {
    it('rejects an empty slug', () => {
        expect(() => WorkspaceSlugRequestSchema.parse('')).toThrow();
    });

    it('accepts a slug of 100 characters and rejects one of 101', () => {
        expect(() =>
            WorkspaceSlugRequestSchema.parse('a'.repeat(100))
        ).not.toThrow();
        expect(() =>
            WorkspaceSlugRequestSchema.parse('a'.repeat(101))
        ).toThrow();
    });
});
