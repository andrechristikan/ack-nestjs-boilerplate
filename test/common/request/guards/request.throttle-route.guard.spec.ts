import type { ExecutionContext, Type } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestThrottleOptionsMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { RequestThrottleRouteGuard } from '@common/request/guards/request.throttle-route.guard';
import type {
    IRequestApp,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { RequestUtil } from '@common/request/utils/request.util';

describe('RequestThrottleRouteGuard', () => {
    const reflector = mock<Reflector>();
    const configGet =
        vi.fn<
            (
                key: string
            ) =>
                | Record<EnumRequestThrottleRoute, IRequestThrottlePolicy>
                | undefined
        >();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const requestUtil = mock<RequestUtil>();
    const requestThrottleService = mock<RequestThrottleService>();
    const policies: Record<EnumRequestThrottleRoute, IRequestThrottlePolicy> = {
        [EnumRequestThrottleRoute.strict]: {
            ttlInMs: 1000,
            limit: 1,
            blockDurationInMs: 5000,
        },
        [EnumRequestThrottleRoute.moderate]: {
            ttlInMs: 2000,
            limit: 10,
            blockDurationInMs: 5000,
        },
        [EnumRequestThrottleRoute.relaxed]: {
            ttlInMs: 3000,
            limit: 100,
            blockDurationInMs: 5000,
        },
    };
    let guard: RequestThrottleRouteGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(policies);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleRouteGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
                { provide: RequestUtil, useValue: requestUtil },
                {
                    provide: RequestThrottleService,
                    useValue: requestThrottleService,
                },
            ],
        }).compile();
        guard = module.get(RequestThrottleRouteGuard);
    });

    describe('canActivate', () => {
        it('reads the route throttle policies from the config service once, in the constructor', () => {
            expect(configGet).toHaveBeenCalledWith('request.throttle.route');
        });

        it('activates with no evaluation when the handler carries no throttle options', async () => {
            const executionContext = mock<ExecutionContext>();
            reflector.get.mockReturnValue(undefined);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('activates with no evaluation when the throttle options carry no route', async () => {
            const executionContext = mock<ExecutionContext>();
            reflector.get.mockReturnValue({ user: true });

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('evaluates the route policy and activates when the throttle options carry a route', async () => {
            const executionContext = mock<ExecutionContext>();
            const httpArgumentsHost = mock<HttpArgumentsHost>();
            const request = mock<IRequestApp>();
            const response = mock<Response>();
            const controllerClass = {
                name: 'TestController',
            } as unknown as Type<unknown>;
            const handler = function testHandler(): void {};

            reflector.get.mockReturnValue({
                route: EnumRequestThrottleRoute.strict,
            });
            executionContext.getHandler.mockReturnValue(handler);
            executionContext.getClass.mockReturnValue(controllerClass);
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            httpArgumentsHost.getResponse.mockReturnValue(response);
            requestUtil.resolveThrottleTrackerIp.mockReturnValue('127.0.0.1');

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(reflector.get).toHaveBeenCalledWith(
                RequestThrottleOptionsMetaKey,
                handler
            );
            expect(requestThrottleService.evaluate).toHaveBeenCalledWith(
                response,
                'route',
                `${EnumRequestThrottleRoute.strict}:TestController.testHandler:127.0.0.1`,
                policies[EnumRequestThrottleRoute.strict]
            );
        });
    });
});
