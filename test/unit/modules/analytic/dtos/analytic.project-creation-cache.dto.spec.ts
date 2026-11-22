import { AnalyticProjectCreationCacheSchema } from '@modules/analytic/dtos/analytic.project-creation-cache.dto';

describe('AnalyticProjectCreationCacheSchema', () => {
    const payload = {
        created: 1,
        perWorkspace: [{ workspaceId: 'workspaceId-1', count: 2 }],
        undeclared: 'extra',
    };
    const expected = {
        created: 1,
        perWorkspace: [{ workspaceId: 'workspaceId-1', count: 2 }],
    };
    const invalid = {
        created: 'text',
        perWorkspace: [{ workspaceId: 'workspaceId-1', count: 2 }],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticProjectCreationCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with created of the wrong type', () => {
        const result = AnalyticProjectCreationCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['created'],
                code: 'invalid_type',
            }),
        ]);
    });
});
