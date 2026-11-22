import { AnalyticWorkspaceCountPageCacheSchema } from '@modules/analytic/dtos/analytic.workspace-count-page-cache.dto';

describe('AnalyticWorkspaceCountPageCacheSchema', () => {
    const payload = {
        type: 'offset',
        count: 1,
        perPage: 2,
        hasNext: true,
        hasPrevious: true,
        page: 3,
        totalPage: 4,
        data: [{ workspaceId: 'workspaceId-1', count: 5 }],
        undeclared: 'extra',
    };
    const expected = {
        type: 'offset',
        count: 1,
        perPage: 2,
        hasNext: true,
        hasPrevious: true,
        page: 3,
        totalPage: 4,
        data: [{ workspaceId: 'workspaceId-1', count: 5 }],
    };
    const invalid = {
        type: 'unknownValue',
        count: 1,
        perPage: 2,
        hasNext: true,
        hasPrevious: true,
        page: 3,
        totalPage: 4,
        data: [{ workspaceId: 'workspaceId-1', count: 5 }],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticWorkspaceCountPageCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with type of the wrong value', () => {
        const result = AnalyticWorkspaceCountPageCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['type'],
                code: 'invalid_value',
            }),
        ]);
    });
});
