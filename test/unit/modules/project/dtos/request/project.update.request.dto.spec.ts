import { ProjectUpdateRequestSchema } from '@modules/project/dtos/request/project.update.request.dto';

describe('ProjectUpdateRequestSchema', () => {
    const payload = {
        name: 'website revamp',
        description: 'marketing site redesign',
    };

    it('parses name and description', () => {
        const result = ProjectUpdateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a null description to clear it', () => {
        const result = ProjectUpdateRequestSchema.parse({
            ...payload,
            description: null,
        });

        expect(result).toEqual({ ...payload, description: null });
    });

    it('rejects an empty body', () => {
        const result = ProjectUpdateRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
            expect.objectContaining({
                path: ['description'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a body missing the name', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            description: payload.description,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a body missing the description', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            name: payload.name,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['description'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a null name', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            ...payload,
            name: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an empty name', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            ...payload,
            name: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name over 150 characters', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            ...payload,
            name: 'a'.repeat(151),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects a description over 500 characters', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            ...payload,
            description: 'a'.repeat(501),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['description'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ProjectUpdateRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('trims and lower-cases name and description and rejects a whitespace-only name', () => {
        expect(
            ProjectUpdateRequestSchema.parse({
                name: '  Apollo Moon  ',
                description: '  Moon LANDING  ',
            })
        ).toEqual({ name: 'apollo moon', description: 'moon landing' });
        expect(
            ProjectUpdateRequestSchema.safeParse({ ...payload, name: '   ' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });
});
