import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';

describe('auth.social.decorator', () => {
    describe('AuthSocialGoogleProtected', () => {
        it('mounts AuthSocialGoogleGuard and the Bearer security metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            AuthSocialGoogleProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthSocialGoogleGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ google: [] }]);
        });
    });

    describe('AuthSocialAppleProtected', () => {
        it('mounts AuthSocialAppleGuard and the Bearer security metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            AuthSocialAppleProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthSocialAppleGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ apple: [] }]);
        });
    });
});
