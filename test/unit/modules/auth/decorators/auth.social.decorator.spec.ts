import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext, Type } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { AuthJwtGuardMissingException } from '@modules/auth/exceptions/auth.jwt-guard-missing.exception';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    AuthSocialAppleProtected,
    AuthSocialEmail,
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

    describe('AuthSocialEmail', () => {
        const target = {} as Type<unknown>;
        AuthSocialEmail()(target, 'email', 0);
        const factory = getParamDecoratorFactory(target, 'email');
        const executionContext = mock<ExecutionContext>();
        const httpArgumentsHost = mock<HttpArgumentsHost>();

        beforeEach(() => {
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
        });

        it('returns the email the social guard put on request.user', () => {
            httpArgumentsHost.getRequest.mockReturnValue({
                user: { email: 'jane@example.com' },
            });

            expect(factory(undefined, executionContext)).toBe(
                'jane@example.com'
            );
        });

        it('throws AuthJwtGuardMissingException when request.user is null', () => {
            httpArgumentsHost.getRequest.mockReturnValue({ user: null });

            expect(() => factory(undefined, executionContext)).toThrow(
                AuthJwtGuardMissingException
            );
        });

        it('throws RequestContextMissingException naming request.user.email when the email is missing', () => {
            httpArgumentsHost.getRequest.mockReturnValue({ user: {} });

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, 'request.user.email');
        });
    });
});
