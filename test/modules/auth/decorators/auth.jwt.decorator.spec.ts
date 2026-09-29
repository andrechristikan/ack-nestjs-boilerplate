import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { mock } from 'vitest-mock-extended';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';

describe('auth.jwt.decorator', () => {
    describe('AuthJwtAccessProtected', () => {
        it('mounts AuthJwtAccessGuard and the Bearer security metadata on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

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
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            AuthJwtRefreshProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([AuthJwtRefreshGuard]);
            expect(
                Reflect.getMetadata('swagger/apiSecurity', descriptor.value)
            ).toEqual([{ refreshToken: [] }]);
        });
    });

    describe('param decorators', () => {
        const executionContext = mock<ExecutionContext>();
        const httpArgumentsHost = mock<HttpArgumentsHost>();

        function extractFactory(
            decorate: () => ParameterDecorator,
            propertyKey: string
        ): (data: unknown, ctx: ExecutionContext) => unknown {
            const target = {} as Type<unknown>;

            decorate()(target, propertyKey, 0);

            const metadata = Reflect.getMetadata(
                ROUTE_ARGS_METADATA,
                target.constructor,
                propertyKey
            ) as Record<
                string,
                { factory: (data: unknown, ctx: ExecutionContext) => unknown }
            >;
            const [paramMetadata] = Object.values(metadata);

            return paramMetadata.factory;
        }

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
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = undefined;
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'payload');

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = null as unknown as IAuthJwtAccessTokenPayload;
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'payload');

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = user;
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'payload');

                expect(factory(undefined, executionContext)).toBe(user);
            });

            it('returns the whole payload when the field is null', () => {
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = user;
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'payload');

                expect(factory(null, executionContext)).toBe(user);
            });

            it('throws RequestContextMissingException when the named field is undefined', () => {
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = user;
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'userId');

                let thrown: unknown;
                try {
                    factory('missingField', executionContext);
                } catch (error) {
                    thrown = error;
                }

                expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = {
                    ...user,
                    jti: null as unknown as string,
                };
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'jti');

                let thrown: unknown;
                try {
                    factory('jti', executionContext);
                } catch (error) {
                    thrown = error;
                }

                expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                const request = mock<IRequestApp<IAuthJwtAccessTokenPayload>>();
                request.user = user;
                httpArgumentsHost.getRequest.mockReturnValue(request);
                const factory = extractFactory(AuthJwtPayload, 'userId');

                expect(factory('userId', executionContext)).toBe(user.userId);
            });
        });

        describe('AuthJwtToken', () => {
            const factory = extractFactory(AuthJwtToken, 'token');

            it('returns undefined when the authorization header is absent', () => {
                const request = mock<IRequestApp>();
                request.headers = {};
                httpArgumentsHost.getRequest.mockReturnValue(request);

                expect(factory(undefined, executionContext)).toBeUndefined();
            });

            it('returns undefined when the authorization header carries no token', () => {
                const request = mock<IRequestApp>();
                request.headers = { authorization: 'Bearer' };
                httpArgumentsHost.getRequest.mockReturnValue(request);

                expect(factory(undefined, executionContext)).toBeUndefined();
            });

            it('returns the token stripped of the scheme prefix', () => {
                const request = mock<IRequestApp>();
                request.headers = { authorization: 'Bearer token-value' };
                httpArgumentsHost.getRequest.mockReturnValue(request);

                expect(factory(undefined, executionContext)).toBe(
                    'token-value'
                );
            });
        });
    });
});
