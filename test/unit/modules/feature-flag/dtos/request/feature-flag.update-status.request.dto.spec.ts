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

    it('parses with targetUserIds omitted', () => {
        const result = FeatureFlagUpdateStatusRequestSchema.parse({
            isEnable: false,
            rolloutPercent: 0,
        });

        expect(result).toEqual({ isEnable: false, rolloutPercent: 0 });
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
            })
        ).toThrow();
    });

    it('rejects a rolloutPercent above 100', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 101,
            })
        ).toThrow();
    });

    it('rejects a non-integer rolloutPercent', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50.5,
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
            FeatureFlagUpdateStatusRequestSchema.parse({ rolloutPercent: 50 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50,
                extra: true,
            })
        ).toThrow();
    });
});
