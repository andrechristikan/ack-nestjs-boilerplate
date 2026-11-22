import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';

vi.mock('@modules/feature-flag/guards/feature-flag.guard', () => ({
    FeatureFlagGuard: vi.fn(),
}));

describe('FeatureFlagProtected', () => {
    it('registers the guard and key-path metadata', () => {
        const handler = vi.fn();
        FeatureFlagProtected('invitationAllowed')({}, 'handler', {
            value: handler,
        });
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(1);
        expect(Reflect.getMetadata(FeatureFlagKeyPathMetaKey, handler)).toBe(
            'invitationAllowed'
        );
    });
});
