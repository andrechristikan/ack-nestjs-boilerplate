import { WorkspaceSlugRequestSchema } from '@modules/workspace/dtos/request/workspace.slug.request.dto';

describe('WorkspaceSlugRequestSchema', () => {
    it('rejects an empty slug', () => {
        const result = WorkspaceSlugRequestSchema.safeParse('');

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'too_small' }),
        ]);
    });

    it('accepts a slug of 100 characters and rejects one of 101', () => {
        expect(() =>
            WorkspaceSlugRequestSchema.parse('a'.repeat(100))
        ).not.toThrow();
        const result = WorkspaceSlugRequestSchema.safeParse('a'.repeat(101));

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'too_big' }),
        ]);
    });
});
