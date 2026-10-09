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
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: false,
                rolloutPercent: 0,
            })
        ).toThrow();
    });

    it('rejects a null targetUserIds', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: false,
                rolloutPercent: 0,
                targetUserIds: null,
            })
        ).toThrow();
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
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: -1,
                targetUserIds: [],
            })
        ).toThrow();
    });

    it('rejects a rolloutPercent above 100', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 101,
                targetUserIds: [],
            })
        ).toThrow();
    });

    it('rejects a non-integer rolloutPercent', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50.5,
                targetUserIds: [],
            })
        ).toThrow();
    });

    it('rejects a targetUserIds entry that is not a 24-character hex string', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50,
                targetUserIds: ['not-a-mongo-id'],
            })
        ).toThrow();
    });

    it('rejects a missing isEnable', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                rolloutPercent: 50,
                targetUserIds: [],
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50,
                targetUserIds: [],
                extra: true,
            })
        ).toThrow();
    });
});
