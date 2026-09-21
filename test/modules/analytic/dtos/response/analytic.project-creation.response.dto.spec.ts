import { AnalyticProjectCreationResponseSchema } from '@modules/analytic/dtos/response/analytic.project-creation.response.dto';

describe('AnalyticProjectCreationResponseSchema', () => {
    const row = {
        created: 2,
        perWorkspace: [{ workspaceId: 'workspace-1', count: 2 }],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticProjectCreationResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticProjectCreationResponseSchema.parse({
            ...row,
            ownerId: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
