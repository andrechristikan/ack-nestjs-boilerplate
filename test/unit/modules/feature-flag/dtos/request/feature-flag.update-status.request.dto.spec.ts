import { FeatureFlagUpdateStatusRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';

describe('FeatureFlagUpdateStatusRequestSchema', () => {
    it('parses the status and rollout percentage', () => {
        expect(
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50,
            })
        ).toEqual({ isEnable: true, rolloutPercent: 50 });
    });

    it('rejects target users in a status update', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({
                isEnable: true,
                rolloutPercent: 50,
                targetUserIds: [],
            })
        ).toThrow();
    });

    it.each([-1, 101, 50.5])(
        'rejects invalid rollout percentage %s',
        rolloutPercent => {
            expect(() =>
                FeatureFlagUpdateStatusRequestSchema.parse({
                    isEnable: true,
                    rolloutPercent,
                })
            ).toThrow();
        }
    );

    it('rejects a missing status', () => {
        expect(() =>
            FeatureFlagUpdateStatusRequestSchema.parse({ rolloutPercent: 50 })
        ).toThrow();
    });
});
