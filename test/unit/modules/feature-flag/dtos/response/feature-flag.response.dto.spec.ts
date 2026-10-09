import { FeatureFlagResponseSchema } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';

describe('FeatureFlagResponseSchema', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-01-03T03:04:05.000Z');

    const row = {
        id: '507f1f77bcf86cd799439011',
        createdAt,
        createdBy: '507f1f77bcf86cd799439012',
        updatedAt,
        updatedBy: '507f1f77bcf86cd799439012',
        key: 'loginWithGoogle',
        isEnable: true,
        targetUserIds: ['507f1f77bcf86cd799439013'],
        metadata: { newFeature: true },
    };

    it('parses a row into exactly the declared fields', () => {
        const result = FeatureFlagResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses null createdBy, updatedBy, and metadata', () => {
        const result = FeatureFlagResponseSchema.parse({
            ...row,
            createdBy: null,
            updatedBy: null,
            metadata: null,
        });

        expect(result).toEqual({
            ...row,
            createdBy: null,
            updatedBy: null,
            metadata: null,
        });
    });

    it('strips deletedAt and deletedBy', () => {
        const result = FeatureFlagResponseSchema.parse({
            ...row,
            deletedAt: new Date('2026-01-04T00:00:00.000Z'),
            deletedBy: '507f1f77bcf86cd799439014',
        });

        expect(result).toEqual(row);
    });

    it('rejects a createdAt that is not a Date', () => {
        expect(() =>
            FeatureFlagResponseSchema.parse({
                ...row,
                createdAt: createdAt.toISOString(),
            })
        ).toThrow();
    });

    it('rejects a missing targetUserIds', () => {
        const { targetUserIds: _targetUserIds, ...rest } = row;

        expect(() => FeatureFlagResponseSchema.parse(rest)).toThrow();
    });
});
