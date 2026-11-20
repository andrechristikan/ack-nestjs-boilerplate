import { ProjectCreateRequestSchema } from '@modules/project/dtos/request/project.create.request.dto';

describe('ProjectCreateRequestSchema', () => {
    it('parses name and description', () => {
        const result = ProjectCreateRequestSchema.parse({
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        });

        expect(result).toEqual({
            name: 'Website Revamp',
            description: 'Marketing site redesign',
        });
    });

    it('parses with description omitted', () => {
        const result = ProjectCreateRequestSchema.parse({
            name: 'Website Revamp',
        });

        expect(result).toEqual({ name: 'Website Revamp' });
    });

    it('rejects an empty name', () => {
        const result = ProjectCreateRequestSchema.safeParse({ name: '' });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name over 150 characters', () => {
        const result = ProjectCreateRequestSchema.safeParse({
            name: 'a'.repeat(151),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects a description over 500 characters', () => {
        const result = ProjectCreateRequestSchema.safeParse({
            name: 'Website Revamp',
            description: 'a'.repeat(501),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['description'], code: 'too_big' }),
        ]);
    });

    it('rejects a missing name', () => {
        const result = ProjectCreateRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ProjectCreateRequestSchema.safeParse({
            name: 'Website Revamp',
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
