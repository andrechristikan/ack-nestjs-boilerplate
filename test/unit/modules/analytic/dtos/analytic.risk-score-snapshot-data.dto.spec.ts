import { AnalyticRiskScoreSnapshotDataSchema } from '@modules/analytic/dtos/analytic.risk-score-snapshot-data.dto';

describe('AnalyticRiskScoreSnapshotDataSchema', () => {
    const payload = {
        userId: 'userId-1',
        score: 1,
        band: 'monitor',
        contributingSignalCodes: ['sessionAfterAdmin'],
        undeclared: 'extra',
    };
    const expected = {
        userId: 'userId-1',
        score: 1,
        band: 'monitor',
        contributingSignalCodes: ['sessionAfterAdmin'],
    };
    const invalid = {
        userId: 123,
        score: 1,
        band: 'monitor',
        contributingSignalCodes: ['sessionAfterAdmin'],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticRiskScoreSnapshotDataSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with userId of the wrong type', () => {
        const result = AnalyticRiskScoreSnapshotDataSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['userId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
