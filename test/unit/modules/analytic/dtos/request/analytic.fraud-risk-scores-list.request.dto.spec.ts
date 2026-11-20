import { AnalyticFraudRiskScoresListRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

describe('AnalyticFraudRiskScoresListRequestSchema', () => {
    it('parses page, perPage, orderBy, and minScore', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'highestValue',
            minScore: 30,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'highestValue',
            minScore: 30,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts a zero minScore', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.parse({
            minScore: 0,
        });

        expect(result).toEqual({ minScore: 0 });
    });

    it('rejects an undeclared key', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.safeParse({
            page: 1,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({ search: 'x' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumAnalyticSnapshotOrderBy).join(', '));
    });

    it.each(Object.values(EnumAnalyticSnapshotOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                AnalyticFraudRiskScoresListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'highestValue:asc',
        'default',
        'createdAt',
        'value',
        'occurredAt',
        'recent',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({ orderBy })
                .error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({
                orderBy: ['highestValue', 'highestValue'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
