import { WorkspaceUpdateSlugRequestSchema } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';

describe('WorkspaceUpdateSlugRequestSchema', () => {
    const payload = { slug: 'acme-team' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceUpdateSlugRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty slug', () => {
        const result = WorkspaceUpdateSlugRequestSchema.safeParse({ slug: '' });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['slug'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceUpdateSlugRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a slug of 100 characters and rejects one of 101', () => {
        expect(() =>
            WorkspaceUpdateSlugRequestSchema.parse({
                ...payload,
                slug: 'a'.repeat(100),
            })
        ).not.toThrow();
        const result = WorkspaceUpdateSlugRequestSchema.safeParse({
            ...payload,
            slug: 'a'.repeat(101),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['slug'], code: 'too_big' }),
        ]);
    });
});
