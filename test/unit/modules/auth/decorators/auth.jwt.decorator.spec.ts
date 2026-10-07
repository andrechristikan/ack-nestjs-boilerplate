import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
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
    });

    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
        mock<HttpArgumentsHost>();

    beforeEach(() => {
        vi.resetAllMocks();
        executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
    });

    describe('AuthJwtPayload', () => {
        const user: IAuthJwtAccessTokenPayload = {
            loginAt: new Date('2026-01-01T00:00:00.000Z'),
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            email: 'jane@example.com',
            username: 'jane',
            userId: 'user-1',
            sessionId: 'session-1',
            deviceOwnershipId: 'device-1',
            roleId: 'role-1',
        };

        it('throws RequestContextMissingException when the request user is undefined', () => {
            const request: Pick<
                IRequestApp<IAuthJwtAccessTokenPayload>,
                'user'
            > = {};
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'payload', 0);
            const factory = getParamDecoratorFactory(target, 'payload');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message: expect.stringContaining('request.user'),
                }) as Error,
            });
        });

        it('throws RequestContextMissingException when the request user is null', () => {
            const request: MockProxy<IRequestApp<IAuthJwtAccessTokenPayload>> =
                mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
            request.user = null as unknown as IAuthJwtAccessTokenPayload;
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'payload', 0);
            const factory = getParamDecoratorFactory(target, 'payload');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message: expect.stringContaining('request.user'),
                }) as Error,
            });
        });

        it('returns the whole payload when no field is given', () => {
            const request: MockProxy<IRequestApp<IAuthJwtAccessTokenPayload>> =
                mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
            request.user = user;
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'payload', 0);
            const factory = getParamDecoratorFactory(target, 'payload');

            expect(factory(undefined, executionContext)).toBe(user);
        });

        it('returns the whole payload when the field is null', () => {
            const request: MockProxy<IRequestApp<IAuthJwtAccessTokenPayload>> =
                mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
            request.user = user;
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'payload', 0);
            const factory = getParamDecoratorFactory(target, 'payload');

            expect(factory(null, executionContext)).toBe(user);
        });

        it('throws RequestContextMissingException when the named field is undefined', () => {
            const request: MockProxy<IRequestApp<IAuthJwtAccessTokenPayload>> =
                mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
            request.user = user;
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'userId', 0);
            const factory = getParamDecoratorFactory(target, 'userId');

            let thrown: unknown;
            try {
                factory('missingField', executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message: expect.stringContaining(
                        'request.user.missingField'
                    ),
                }) as Error,
            });
        });

        it('throws RequestContextMissingException when the named field is null', () => {
            const request: MockProxy<IRequestApp<IAuthJwtAccessTokenPayload>> =
                mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
            request.user = {
                ...user,
                jti: null as unknown as string,
            };
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'jti', 0);
            const factory = getParamDecoratorFactory(target, 'jti');

            let thrown: unknown;
            try {
                factory('jti', executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message: expect.stringContaining('request.user.jti'),
                }) as Error,
            });
        });

        it('returns the named field when present', () => {
            const request: MockProxy<IRequestApp<IAuthJwtAccessTokenPayload>> =
                mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
            request.user = user;
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const target = {} as Type<unknown>;
            AuthJwtPayload()(target, 'userId', 0);
            const factory = getParamDecoratorFactory(target, 'userId');

            expect(factory('userId', executionContext)).toBe(user.userId);
        });
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
