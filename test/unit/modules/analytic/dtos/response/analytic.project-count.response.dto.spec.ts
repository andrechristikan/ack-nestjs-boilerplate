import { AnalyticProjectCountResponseSchema } from '@modules/analytic/dtos/response/analytic.project-count.response.dto';

describe('AnalyticProjectCountResponseSchema', () => {
    const row = { projectId: 'project-1', count: 4 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticProjectCountResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticProjectCountResponseSchema.parse({
            ...row,
            name: 'secret-project',
        });

        expect(result).toEqual(row);
    });
});
