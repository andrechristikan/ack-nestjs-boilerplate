import { AnalyticRiskScoreUserPipelineSchema } from '@modules/analytic/dtos/analytic.risk-score-user-pipeline.dto';

describe('AnalyticRiskScoreUserPipelineSchema', () => {
    const data = {
        userId: 'userId-1',
        score: 1,
        band: 'monitor',
        contributingSignalCodes: ['sessionAfterAdmin'],
    };
    const payload = [
        {
            computedAt: '2025-01-01T00:00:00.000Z',
            data: { ...data, undeclared: 'extra' },
            undeclared: 'extra',
        },
    ];
    const expected = [
        { computedAt: new Date('2025-01-01T00:00:00.000Z'), data },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticRiskScoreUserPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('parses a null computedAt and a null data', () => {
        const result = AnalyticRiskScoreUserPipelineSchema.parse([
            { computedAt: null, data: null },
        ]);

        expect(result).toEqual([{ computedAt: null, data: null }]);
    });

    it('refuses a payload with 0.computedAt that is not a date', () => {
        const result = AnalyticRiskScoreUserPipelineSchema.safeParse([
            { ...payload[0], computedAt: 'not-a-date' },
        ]);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('refuses a payload with 0.data.band outside the enum', () => {
        const result = AnalyticRiskScoreUserPipelineSchema.safeParse([
            { ...payload[0], data: { ...data, band: 'unknown' } },
        ]);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'data', 'band'],
                code: 'invalid_value',
            }),
        ]);
    });
});
