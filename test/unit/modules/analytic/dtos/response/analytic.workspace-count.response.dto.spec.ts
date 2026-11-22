import { AnalyticWorkspaceCountResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-count.response.dto';

describe('AnalyticWorkspaceCountResponseSchema', () => {
    const row = { workspaceId: 'workspace-1', count: 3 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticWorkspaceCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticWorkspaceCountResponseSchema.parse({
            ...row,
            name: 'secret-workspace',
        });

        expect(result).toEqual(row);
    });
});
