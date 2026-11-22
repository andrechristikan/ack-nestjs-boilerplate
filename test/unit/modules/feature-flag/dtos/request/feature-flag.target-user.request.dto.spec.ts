import { FeatureFlagTargetUserRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request.dto';

describe('FeatureFlagTargetUserRequestSchema', () => {
    it('parses a UUID user id', () => {
        const userId = '01920000-0000-7000-8000-6cd799439011';
        expect(FeatureFlagTargetUserRequestSchema.parse({ userId })).toEqual({
            userId,
        });
    });

    it('rejects an invalid UUID', () => {
        expect(() =>
            FeatureFlagTargetUserRequestSchema.parse({ userId: 'invalid' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            FeatureFlagTargetUserRequestSchema.parse({
                userId: '01920000-0000-7000-8000-6cd799439011',
                extra: true,
            })
        ).toThrow();
    });
});
