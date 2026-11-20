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
        rolloutPercent: 50,
        description: 'Allows sign-in with Google',
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
        const result = FeatureFlagResponseSchema.safeParse({
            ...row,
            createdAt: createdAt.toISOString(),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['createdAt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('keeps rolloutPercent and description', () => {
        const result = FeatureFlagResponseSchema.parse(row);

        expect(result.rolloutPercent).toBe(50);
        expect(result.description).toBe('Allows sign-in with Google');
    });

    it('rejects a rolloutPercent of 101', () => {
        const result = FeatureFlagResponseSchema.safeParse({
            ...row,
            rolloutPercent: 101,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['rolloutPercent'],
                code: 'too_big',
            }),
        ]);
    });

    it('rejects a missing targetUserIds', () => {
        const { targetUserIds: _targetUserIds, ...rest } = row;

        const result = FeatureFlagResponseSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserIds'],
                code: 'invalid_type',
            }),
        ]);
    });
});
