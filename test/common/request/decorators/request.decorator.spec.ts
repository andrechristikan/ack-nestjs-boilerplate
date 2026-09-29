import {
    GUARDS_METADATA,
    INTERCEPTORS_METADATA,
    ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import {
    RequestEnvProtected,
    RequestGeoLocation,
    RequestIPAddress,
    RequestThrottle,
    RequestTimeout,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { RequestThrottleUserInterceptor } from '@common/request/interceptors/request.throttle-user.interceptor';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';

describe('request.decorator', () => {
    describe('RequestTimeout', () => {
        it('sets the custom-timeout flag and value on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            RequestTimeout('5s')(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    RequestCustomTimeoutMetaKey,
                    descriptor.value
                )
            ).toBe(true);
            expect(
                Reflect.getMetadata(
                    RequestCustomTimeoutValueMetaKey,
                    descriptor.value
                )
            ).toBe('5s');
        });
    });

    describe('RequestEnvProtected', () => {
        it('mounts RequestEnvGuard and the allowed environments on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };

            RequestEnvProtected(
                EnumAppEnvironment.local,
                EnumAppEnvironment.development
            )(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RequestEnvGuard]);
            expect(
                Reflect.getMetadata(RequestEnvMetaKey, descriptor.value)
            ).toEqual([
                EnumAppEnvironment.local,
                EnumAppEnvironment.development,
            ]);
        });
    });

    describe('RequestThrottle', () => {
        it('sets the throttle options and mounts RequestThrottleUserInterceptor on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: (): void => {} };
            const options = { user: true };

            RequestThrottle(options)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    RequestThrottleOptionsMetaKey,
                    descriptor.value
                )
            ).toBe(options);
            expect(
                Reflect.getMetadata(INTERCEPTORS_METADATA, descriptor.value)
            ).toEqual([RequestThrottleUserInterceptor]);
        });
    });

    describe('param decorators', () => {
        const clsService =
            mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext = mock<ExecutionContext>();

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

        function expectContextMissingException(thrown: unknown): void {
            expect(thrown).toBeInstanceOf(RequestContextMissingException);
            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
            });
        }

        const defaultUserAgent: UserAgent = {
            ua: null,
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        };
        const defaultGeoLocation: GeoLocation = {
            latitude: 1,
            longitude: 2,
            country: 'US',
            region: 'CA',
            city: 'SF',
        };

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe('RequestIPAddress', () => {
            const factory = extractFactory(RequestIPAddress, 'ipAddress');

            it('throws RequestContextMissingException when the request-log store is undefined', () => {
                clsService.get.mockReturnValue(undefined);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when the request-log store is null', () => {
                clsService.get.mockReturnValue(null);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when ipAddress is undefined', () => {
                clsService.get.mockReturnValue({
                    ipAddress: undefined,
                } as unknown as IRequestLog);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when ipAddress is null', () => {
                const requestLog: IRequestLog = {
                    userAgent: defaultUserAgent,
                    ipAddress: null,
                    geoLocation: defaultGeoLocation,
                };
                clsService.get.mockReturnValue(requestLog);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('returns the resolved ip address', () => {
                const requestLog: IRequestLog = {
                    userAgent: defaultUserAgent,
                    ipAddress: '127.0.0.1',
                    geoLocation: defaultGeoLocation,
                };
                clsService.get.mockReturnValue(requestLog);

                expect(factory(undefined, executionContext)).toBe('127.0.0.1');
            });
        });

        describe('RequestUserAgent', () => {
            const factory = extractFactory(RequestUserAgent, 'userAgent');
            const userAgent: UserAgent = {
                ua: 'ua',
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            };

            it('throws RequestContextMissingException when the request-log store is undefined', () => {
                clsService.get.mockReturnValue(undefined);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when the request-log store is null', () => {
                clsService.get.mockReturnValue(null);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when userAgent is undefined', () => {
                clsService.get.mockReturnValue({
                    userAgent: undefined,
                } as unknown as IRequestLog);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when userAgent is null', () => {
                const requestLog: IRequestLog = {
                    userAgent: null as unknown as UserAgent,
                    ipAddress: '127.0.0.1',
                    geoLocation: defaultGeoLocation,
                };
                clsService.get.mockReturnValue(requestLog);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('returns the resolved user agent', () => {
                const requestLog: IRequestLog = {
                    userAgent,
                    ipAddress: '127.0.0.1',
                    geoLocation: defaultGeoLocation,
                };
                clsService.get.mockReturnValue(requestLog);

                expect(factory(undefined, executionContext)).toBe(userAgent);
            });
        });

        describe('RequestGeoLocation', () => {
            const factory = extractFactory(RequestGeoLocation, 'geoLocation');
            const geoLocation: GeoLocation = {
                latitude: 1,
                longitude: 2,
                country: 'US',
                region: 'CA',
                city: 'SF',
            };

            it('throws RequestContextMissingException when the request-log store is undefined', () => {
                clsService.get.mockReturnValue(undefined);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when the request-log store is null', () => {
                clsService.get.mockReturnValue(null);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when geoLocation is undefined', () => {
                clsService.get.mockReturnValue({
                    geoLocation: undefined,
                } as unknown as IRequestLog);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('throws RequestContextMissingException when geoLocation is null', () => {
                const requestLog: IRequestLog = {
                    userAgent: defaultUserAgent,
                    ipAddress: '127.0.0.1',
                    geoLocation: null,
                };
                clsService.get.mockReturnValue(requestLog);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectContextMissingException(thrown);
            });

            it('returns the resolved geo-location', () => {
                const requestLog: IRequestLog = {
                    userAgent: defaultUserAgent,
                    ipAddress: '127.0.0.1',
                    geoLocation,
                };
                clsService.get.mockReturnValue(requestLog);

                expect(factory(undefined, executionContext)).toBe(geoLocation);
            });
        });
    });
});
