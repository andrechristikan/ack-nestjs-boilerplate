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
});
