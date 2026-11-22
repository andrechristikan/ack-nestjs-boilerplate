import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';

vi.mock('@modules/auth/guards/social/auth.social.apple.guard', () => ({
    AuthSocialAppleGuard: vi.fn(),
}));
vi.mock('@modules/auth/guards/social/auth.social.google.guard', () => ({
    AuthSocialGoogleGuard: vi.fn(),
}));

describe('auth social decorators', () => {
    it.each([AuthSocialGoogleProtected, AuthSocialAppleProtected])(
        'registers its social authentication guard',
        decorator => {
            const handler = vi.fn();
            decorator()({}, 'handler', { value: handler });
            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(
                1
            );
        }
    );
});
