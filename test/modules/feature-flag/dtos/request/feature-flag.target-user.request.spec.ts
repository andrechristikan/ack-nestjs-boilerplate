import { describe, expect, it } from 'vitest';
import { FeatureFlagTargetUserRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request';

describe('FeatureFlagTargetUserRequestDto', () => {
    it('accepts a valid target user id', () => {
        expect(
            FeatureFlagTargetUserRequestSchema.parse({
                userId: '00000000-0000-4000-8000-000000000000',
            })
        ).toEqual({ userId: '00000000-0000-4000-8000-000000000000' });
    });

    it('rejects an empty target user id', () => {
        expect(
            FeatureFlagTargetUserRequestSchema.safeParse({ userId: '' }).success
        ).toBe(false);
    });
});
