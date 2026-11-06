import { HttpStatus } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
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
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthSocialGoogleProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthSocialGoogleGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ google: [] }]);
        });

        it('documents the Google error kit, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthSocialGoogleProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                    messagePath: 'auth.error.socialGoogleInvalid',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
                    messagePath: 'auth.error.socialGoogleRequired',
                },
                {
                    httpStatus: HttpStatus.NOT_FOUND,
                    statusCode:
                        EnumAuthStatusCodeError.socialGoogleNotConfigured,
                    messagePath: 'auth.error.socialGoogleNotConfigured',
                },
                {
                    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                    statusCode: EnumAuthStatusCodeError.providerUnavailable,
                    messagePath: 'auth.error.providerUnavailable',
                },
            ]);
        });
    });

    describe('AuthSocialAppleProtected', () => {
        it('mounts AuthSocialAppleGuard and the Bearer security metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthSocialAppleProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthSocialAppleGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ apple: [] }]);
        });

        it('documents the Apple error kit, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthSocialAppleProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
                    messagePath: 'auth.error.socialAppleInvalid',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.socialAppleRequired,
                    messagePath: 'auth.error.socialAppleRequired',
                },
                {
                    httpStatus: HttpStatus.NOT_FOUND,
                    statusCode:
                        EnumAuthStatusCodeError.socialAppleNotConfigured,
                    messagePath: 'auth.error.socialAppleNotConfigured',
                },
                {
                    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                    statusCode: EnumAuthStatusCodeError.providerUnavailable,
                    messagePath: 'auth.error.providerUnavailable',
                },
            ]);
        });
    });
});
