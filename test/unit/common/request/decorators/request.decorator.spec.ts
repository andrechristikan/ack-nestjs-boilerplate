import {
    GUARDS_METADATA,
    INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { UseGuards, applyDecorators } from '@nestjs/common';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
    hasRequestGuard,
} from '@common/request/decorators/request.decorator';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { RequestThrottleRouteGuard } from '@common/request/guards/request.throttle-route.guard';
import { RequestThrottleUserInterceptor } from '@common/request/interceptors/request.throttle-user.interceptor';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { expectRequestContextMissing } from '@test/unit/helpers/test.unit.request.helper';
import { RequestEnvProtectedEmptyException } from '@common/request/exceptions/request.env-protected-empty.exception';

describe('request.decorator', () => {
    describe('RequestTimeout', () => {
        it('sets the custom-timeout flag and value on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

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
            const descriptor: PropertyDescriptor = { value: vi.fn() };

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

        it('throws at evaluation when no environment is given', () => {
            expect(() => RequestEnvProtected()).toThrow(
                RequestEnvProtectedEmptyException
            );
            expect(() => RequestEnvProtected()).toThrow(
                'RequestEnvProtected needs at least one environment'
            );
        });
    });

    describe('hasRequestGuard', () => {
        it('returns true when UseGuards mounted the guard on the method before', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            UseGuards(RequestEnvGuard)(target, 'method', descriptor);

            expect(hasRequestGuard(descriptor, RequestEnvGuard)).toBe(true);
        });

        it('returns false when the method carries no guard', () => {
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            expect(hasRequestGuard(descriptor, RequestEnvGuard)).toBe(false);
        });

        it('returns false when only another guard is mounted', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            UseGuards(RequestThrottleRouteGuard)(target, 'method', descriptor);

            expect(hasRequestGuard(descriptor, RequestEnvGuard)).toBe(false);
        });

        it('sees inside a decorator only the guards applied below it', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            const seen: boolean[] = [];
            const probe = vi
                .fn()
                .mockImplementation((probed: PropertyDescriptor) => {
                    seen.push(
                        hasRequestGuard(probed, RequestEnvGuard),
                        hasRequestGuard(probed, RequestThrottleRouteGuard)
                    );
                });

            // legacy decorators apply bottom-up: the env guard, then the probe, then the throttle guard
            UseGuards(RequestEnvGuard)(target, 'method', descriptor);
            probe(descriptor);
            UseGuards(RequestThrottleRouteGuard)(target, 'method', descriptor);

            expect(seen).toEqual([true, false]);
        });

        it('reads the stack an applyDecorators decorator mounts', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            applyDecorators(
                UseGuards(RequestEnvGuard, RequestThrottleRouteGuard)
            )(target, 'method', descriptor);

            expect(hasRequestGuard(descriptor, RequestEnvGuard)).toBe(true);
            expect(hasRequestGuard(descriptor, RequestThrottleRouteGuard)).toBe(
                true
            );
        });
    });

    describe('RequestThrottle', () => {
        it('sets the throttle options and mounts RequestThrottleUserInterceptor on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
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

    const clsService: MockProxy<
        ReturnType<typeof ClsServiceManager.getClsService>
    > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

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
        const target = {} as Type<unknown>;
        RequestIPAddress()(target, 'ipAddress', 0);
        const factory = getParamDecoratorFactory(target, 'ipAddress');

        it('throws RequestContextMissingException when the request-log store is undefined', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when the request-log store is null', () => {
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
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

            expectRequestContextMissing(thrown);
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

            expectRequestContextMissing(thrown);
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
        const target = {} as Type<unknown>;
        RequestUserAgent()(target, 'userAgent', 0);
        const factory = getParamDecoratorFactory(target, 'userAgent');
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

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when the request-log store is null', () => {
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
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

            expectRequestContextMissing(thrown);
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

            expectRequestContextMissing(thrown);
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
        const target = {} as Type<unknown>;
        RequestGeoLocation()(target, 'geoLocation', 0);
        const factory = getParamDecoratorFactory(target, 'geoLocation');
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

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when the request-log store is null', () => {
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
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

            expectRequestContextMissing(thrown);
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

            expectRequestContextMissing(thrown);
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
