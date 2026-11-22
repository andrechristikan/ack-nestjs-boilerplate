import { AnalyticWorkspaceCountCacheSchema } from '@modules/analytic/dtos/analytic.workspace-count-cache.dto';

describe('AnalyticWorkspaceCountCacheSchema', () => {
    const payload = {
        workspaceId: 'workspaceId-1',
        count: 1,
        undeclared: 'extra',
    };
    const expected = { workspaceId: 'workspaceId-1', count: 1 };
    const invalid = { workspaceId: 123, count: 1 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticWorkspaceCountCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with workspaceId of the wrong type', () => {
        const result = AnalyticWorkspaceCountCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
