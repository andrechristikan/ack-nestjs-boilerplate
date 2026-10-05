import { ProjectUpdateSlugRequestSchema } from '@modules/project/dtos/request/project.update-slug.request.dto';

describe('ProjectUpdateSlugRequestSchema', () => {
    it('parses slug', () => {
        const result = ProjectUpdateSlugRequestSchema.parse({
            slug: 'website-revamp',
        });

        expect(result).toEqual({ slug: 'website-revamp' });
    });

    it('rejects an empty slug', () => {
        expect(() =>
            ProjectUpdateSlugRequestSchema.parse({ slug: '' })
        ).toThrow();
    });

    it('rejects a missing slug', () => {
        expect(() => ProjectUpdateSlugRequestSchema.parse({})).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectUpdateSlugRequestSchema.parse({
                slug: 'website-revamp',
                extra: true,
            })
        ).toThrow();
    });
});
