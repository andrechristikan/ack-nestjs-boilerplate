import { AnalyticProjectCreationPipelineSchema } from '@modules/analytic/dtos/analytic.project-creation-pipeline.dto';

describe('AnalyticProjectCreationPipelineSchema', () => {
    const payload = [
        {
            created: [{ n: 1 }],
            perWorkspace: [{ _id: { $oid: '$oid-1' }, count: 2 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        { created: [{ n: 1 }], perWorkspace: [{ _id: '$oid-1', count: 2 }] },
    ];
    const invalid = [
        {
            created: [{ n: 'text' }],
            perWorkspace: [{ _id: { $oid: '$oid-1' }, count: 2 }],
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticProjectCreationPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.created.0.n of the wrong type', () => {
        const result = AnalyticProjectCreationPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'created', 0, 'n'],
                code: 'invalid_type',
            }),
        ]);
    });
});
