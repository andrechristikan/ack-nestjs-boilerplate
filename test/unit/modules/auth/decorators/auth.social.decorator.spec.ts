import { HttpStatus } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { ExecutionContext, Type } from '@nestjs/common';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import {
    AuthSocialContext,
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { AuthSocialContextStoreKey } from '@modules/auth/constants/auth.constant';
import {
    buildAuthSocialContext,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
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
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.socialNonceInvalid,
                    messagePath: 'auth.error.socialNonceInvalid',
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
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.socialNonceInvalid,
                    messagePath: 'auth.error.socialNonceInvalid',
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

    describe('AuthSocialContext', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        AuthSocialContext()(target, 'authSocialContext', 0);
        const factory = getParamDecoratorFactory(target, 'authSocialContext');

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestContextMissingException naming the key when the store holds none', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                AuthSocialContextStoreKey
            );
        });

        it('returns the stored social context', () => {
            const authContext = buildAuthSocialContext(
                'jane@example.com',
                'subject-jane'
            );
            clsService.get.mockReturnValue(authContext);

            expect(factory(undefined, executionContext)).toBe(authContext);
            expect(clsService.get).toHaveBeenCalledWith(
                AuthSocialContextStoreKey
            );
        });
    });
});
