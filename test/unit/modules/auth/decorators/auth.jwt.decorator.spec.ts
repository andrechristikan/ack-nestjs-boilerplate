import { HttpStatus } from '@nestjs/common';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    AuthJwtAccessProtected,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
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

    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
        mock<HttpArgumentsHost>();

    beforeEach(() => {
        vi.resetAllMocks();
        executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
    });

    describe('AuthJwtToken', () => {
        const target = {} as Type<unknown>;
        AuthJwtToken()(target, 'token', 0);
        const factory = getParamDecoratorFactory(target, 'token');

        it('returns null when the authorization header is absent', () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};
            httpArgumentsHost.getRequest.mockReturnValue(request);

            expect(factory(undefined, executionContext)).toBeNull();
        });

        it('returns null when the authorization header carries no token', () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { authorization: 'Bearer' };
            httpArgumentsHost.getRequest.mockReturnValue(request);

            expect(factory(undefined, executionContext)).toBeNull();
        });

        it('returns the token stripped of the scheme prefix', () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { authorization: 'Bearer token-value' };
            httpArgumentsHost.getRequest.mockReturnValue(request);

            expect(factory(undefined, executionContext)).toBe('token-value');
        });
    });
});
