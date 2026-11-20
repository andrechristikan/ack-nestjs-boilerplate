import { HttpStatus } from '@nestjs/common';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    AuthJwtAccessProtected,
    AuthJwtRefreshProtected,
    AuthJwtAccessContext,
    AuthJwtRefreshContext,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import {
    AuthJwtAccessContextStoreKey,
    AuthJwtRefreshContextStoreKey,
} from '@modules/auth/constants/auth.constant';
import {
    buildAuthJwtAccessContext,
    buildAuthJwtRefreshContext,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';

describe('auth.jwt.decorator', () => {
    describe('AuthJwtAccessProtected', () => {
        it('mounts AuthJwtAccessGuard and the Bearer security metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthJwtAccessProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthJwtAccessGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ accessToken: [] }]);
        });

        it('documents the access token error kit, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthJwtAccessProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                    messagePath: 'auth.error.accessTokenUnauthorized',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumSessionStatusCodeError.revoked,
                    messagePath: 'session.error.revoked',
                },
                {
                    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                    statusCode: EnumAuthStatusCodeError.providerUnavailable,
                    messagePath: 'auth.error.providerUnavailable',
                },
            ]);
        });
    });

    describe('AuthJwtRefreshProtected', () => {
        it('mounts AuthJwtRefreshGuard and the Bearer security metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthJwtRefreshProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthJwtRefreshGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ refreshToken: [] }]);
        });

        it('documents the refresh token error kit, in order', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            AuthJwtRefreshProtected()(target, 'method', descriptor);

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                    messagePath: 'auth.error.refreshTokenUnauthorized',
                },
                {
                    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                    statusCode: EnumAuthStatusCodeError.providerUnavailable,
                    messagePath: 'auth.error.providerUnavailable',
                },
            ]);
        });
    });

    describe('AuthJwtAccessContext', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        AuthJwtAccessContext()(target, 'authJwtAccessContext', 0);
        const factory = getParamDecoratorFactory(
            target,
            'authJwtAccessContext'
        );

        beforeEach(() => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
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
                AuthJwtAccessContextStoreKey
            );
        });

        it('returns the stored context', () => {
            const authContext = buildAuthJwtAccessContext('user-1');
            clsService.get.mockReturnValue(authContext);

            expect(factory(undefined, executionContext)).toBe(authContext);
            expect(clsService.get).toHaveBeenCalledWith(
                AuthJwtAccessContextStoreKey
            );
        });
    });

    describe('AuthJwtRefreshContext', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        AuthJwtRefreshContext()(target, 'authJwtRefreshContext', 0);
        const factory = getParamDecoratorFactory(
            target,
            'authJwtRefreshContext'
        );

        beforeEach(() => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
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
                AuthJwtRefreshContextStoreKey
            );
        });

        it('returns the stored context', () => {
            const authContext = buildAuthJwtRefreshContext(
                'user-1',
                'refresh-token'
            );
            clsService.get.mockReturnValue(authContext);

            expect(factory(undefined, executionContext)).toBe(authContext);
            expect(clsService.get).toHaveBeenCalledWith(
                AuthJwtRefreshContextStoreKey
            );
        });
    });
});
