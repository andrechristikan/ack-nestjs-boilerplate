import { AnalyticRiskScorePipelineSchema } from '@modules/analytic/dtos/analytic.risk-score-pipeline.dto';

describe('AnalyticRiskScorePipelineSchema', () => {
    const payload = [
        {
            userId: { $oid: '$oid-1' },
            score: 1,
            band: 'monitor',
            signals: ['sessionAfterAdmin'],
            undeclared: 'extra',
        },
    ];
    const expected = [
        {
            userId: '$oid-1',
            score: 1,
            band: 'monitor',
            signals: ['sessionAfterAdmin'],
        },
    ];
    const invalid = [
        {
            userId: { $oid: 123 },
            score: 1,
            band: 'monitor',
            signals: ['sessionAfterAdmin'],
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticRiskScorePipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.userId.$oid of the wrong type', () => {
        const result = AnalyticRiskScorePipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'userId', '$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});
