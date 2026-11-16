import { WorkspaceUpdateSlugRequestSchema } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';

describe('WorkspaceUpdateSlugRequestSchema', () => {
    const payload = { slug: 'acme-team' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceUpdateSlugRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty slug', () => {
        expect(() =>
            WorkspaceUpdateSlugRequestSchema.parse({ slug: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceUpdateSlugRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });

    it('accepts a slug of 100 characters and rejects one of 101', () => {
        expect(() =>
            WorkspaceUpdateSlugRequestSchema.parse({
                ...payload,
                slug: 'a'.repeat(100),
            })
        ).not.toThrow();
        expect(() =>
            WorkspaceUpdateSlugRequestSchema.parse({
                ...payload,
                slug: 'a'.repeat(101),
            })
        ).toThrow();
    });
});
