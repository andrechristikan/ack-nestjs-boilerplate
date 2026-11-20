import { ProjectUpdateSlugRequestSchema } from '@modules/project/dtos/request/project.update-slug.request.dto';

describe('ProjectUpdateSlugRequestSchema', () => {
    it('parses slug', () => {
        const result = ProjectUpdateSlugRequestSchema.parse({
            slug: 'website-revamp',
        });

        expect(result).toEqual({ slug: 'website-revamp' });
    });

    it('rejects an empty slug', () => {
        const result = ProjectUpdateSlugRequestSchema.safeParse({ slug: '' });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['slug'], code: 'too_small' }),
        ]);
    });

    it('rejects a missing slug', () => {
        const result = ProjectUpdateSlugRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['slug'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ProjectUpdateSlugRequestSchema.safeParse({
            slug: 'website-revamp',
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a slug of 100 characters and rejects one of 101', () => {
        expect(() =>
            ProjectUpdateSlugRequestSchema.parse({ slug: 'a'.repeat(100) })
        ).not.toThrow();
        const result = ProjectUpdateSlugRequestSchema.safeParse({
            slug: 'a'.repeat(101),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['slug'], code: 'too_big' }),
        ]);
    });
});
