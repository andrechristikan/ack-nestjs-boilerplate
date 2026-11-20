import { FeatureFlagUpdateStatusRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';

describe('FeatureFlagUpdateStatusRequestSchema', () => {
    it('parses isEnable, rolloutPercent, and targetUserIds', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.parse({
            isEnable: true,
            rolloutPercent: 50,
            targetUserIds: ['507f1f77bcf86cd799439011'],
        });

        expect(result).toEqual({
            isEnable: true,
            rolloutPercent: 50,
            targetUserIds: ['507f1f77bcf86cd799439011'],
        });
    });

    it('rejects a body missing targetUserIds', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: false,
            rolloutPercent: 0,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserIds'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a null targetUserIds', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: false,
            rolloutPercent: 0,
            targetUserIds: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserIds'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('parses an empty targetUserIds array', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.parse({
            isEnable: true,
            rolloutPercent: 100,
            targetUserIds: [],
        });

        expect(result).toEqual({
            isEnable: true,
            rolloutPercent: 100,
            targetUserIds: [],
        });
    });

    it('rejects a rolloutPercent below 0', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: true,
            rolloutPercent: -1,
            targetUserIds: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['rolloutPercent'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects a rolloutPercent above 100', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: true,
            rolloutPercent: 101,
            targetUserIds: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['rolloutPercent'],
                code: 'too_big',
            }),
        ]);
    });

    it('rejects a non-integer rolloutPercent', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: true,
            rolloutPercent: 50.5,
            targetUserIds: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['rolloutPercent'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a targetUserIds entry that is not a 24-character hex string', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: true,
            rolloutPercent: 50,
            targetUserIds: ['not-a-mongo-id'],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserIds', 0],
                code: 'too_small',
            }),
            expect.objectContaining({
                path: ['targetUserIds', 0],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects a missing isEnable', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            rolloutPercent: 50,
            targetUserIds: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isEnable'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: true,
            rolloutPercent: 50,
            targetUserIds: [],
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts 1000 targetUserIds and rejects 1001', () => {
        const id = '507f1f77bcf86cd799439011';

        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50,
                targetUserIds: new Array(1000).fill(id),
            })
        ).not.toThrow();
        const result = FeatureFlagUpdateStatusRequestSchema.safeParse({
            isEnable: true,
            rolloutPercent: 50,
            targetUserIds: new Array(1001).fill(id),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserIds'],
                code: 'too_big',
            }),
        ]);
    });
});
