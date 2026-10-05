import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    RequestThrottleHandledStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import { RequestThrottleUserInterceptor } from '@common/request/interceptors/request.throttle-user.interceptor';
import type {
    IRequestApp,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { subscribeNext } from '@test/unit/helpers/test.unit.observable.helper';

describe('RequestThrottleUserInterceptor', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configGet =
        vi.fn<(key: string) => IRequestThrottlePolicy | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestThrottleService: MockProxy<RequestThrottleService> =
        mock<RequestThrottleService>();
    const policy = { ttlInMs: 1000, limit: 5, blockDurationInMs: 5000 };
    let interceptor: RequestThrottleUserInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(policy);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleUserInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                {
                    provide: RequestThrottleService,
                    useValue: requestThrottleService,
                },
            ],
        }).compile();
        interceptor = module.get(RequestThrottleUserInterceptor);
    });

    describe('intercept', () => {
        it('reads the user throttle policy from the config service once, in the constructor', () => {
            expect(configGet).toHaveBeenCalledWith('request.throttle.user');
        });

        it('hands off with no evaluation when the request already had its throttle handled', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            requestStoreService.get.mockReturnValue(true);

            const observable = await interceptor.intercept(
                executionContext,
                callHandler
            );
            const result = await subscribeNext(observable);

            expect(result).toBe('handled');
            expect(requestStoreService.set).not.toHaveBeenCalled();
            expect(reflector.get).not.toHaveBeenCalled();
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('marks the throttle handled and hands off with no evaluation when the handler carries no user option', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            requestStoreService.get.mockReturnValue(false);
            reflector.get.mockReturnValue({ route: undefined });
            const handler = vi.fn();
            executionContext.getHandler.mockReturnValue(handler);

            const observable = await interceptor.intercept(
                executionContext,
                callHandler
            );
            const result = await subscribeNext(observable);

            expect(result).toBe('handled');
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestThrottleHandledStoreKey,
                true
            );
            expect(reflector.get).toHaveBeenCalledWith(
                RequestThrottleOptionsMetaKey,
                handler
            );
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('hands off with no evaluation when the request carries no authenticated user', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.user = undefined;
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            requestStoreService.get.mockReturnValue(false);
            reflector.get.mockReturnValue({ user: true });
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);

            const observable = await interceptor.intercept(
                executionContext,
                callHandler
            );
            const result = await subscribeNext(observable);

            expect(result).toBe('handled');
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('evaluates the user policy and hands off when the request carries an authenticated user', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
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
            request.user = user;
            const response: MockProxy<Response> = mock<Response>();
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            requestStoreService.get.mockReturnValue(false);
            reflector.get.mockReturnValue({ user: true });
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            httpArgumentsHost.getResponse.mockReturnValue(response);

            const observable = await interceptor.intercept(
                executionContext,
                callHandler
            );
            const result = await subscribeNext(observable);

            expect(result).toBe('handled');
            expect(requestThrottleService.evaluate).toHaveBeenCalledWith(
                response,
                EnumRequestThrottleName.user,
                'user-1',
                policy
            );
        });
    });
});
