import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestThrottleOptionsMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { RequestThrottleRouteGuard } from '@common/request/guards/request.throttle-route.guard';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { RequestUtil } from '@common/request/utils/request.util';
import type { Response } from 'express';

describe('RequestThrottleRouteGuard', () => {
    const policy = { ttlInMs: 1_000, limit: 5, blockDurationInMs: 30_000 };
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const requestUtil: MockProxy<RequestUtil> = mock<RequestUtil>();
    const requestThrottleService: MockProxy<RequestThrottleService> =
        mock<RequestThrottleService>();
    const request: MockProxy<IRequestApp> = mock<IRequestApp>();
    const response: MockProxy<Response> = mock<Response>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpContext: MockProxy<ReturnType<ExecutionContext['switchToHttp']>> =
        mock<ReturnType<ExecutionContext['switchToHttp']>>();
    class UserController {}
    function login() {}
    let guard: RequestThrottleRouteGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context.getType.mockReturnValue('http');
        context.getHandler.mockReturnValue(login);
        context.getClass.mockReturnValue(UserController);
        context.switchToHttp.mockReturnValue(httpContext);
        httpContext.getRequest.mockReturnValue(request);
        httpContext.getResponse.mockReturnValue(response);
        vi.mocked(configService.get).mockReturnValue({
            [EnumRequestThrottleRoute.strict]: policy,
            [EnumRequestThrottleRoute.moderate]: policy,
            [EnumRequestThrottleRoute.relaxed]: policy,
        });
        requestUtil.resolveThrottleTrackerIp.mockReturnValue('203.0.113.10');
        const moduleRef: TestingModule = await Test.createTestingModule({
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
        guard = moduleRef.get(RequestThrottleRouteGuard);
    });

    it('allows a route without opt-in metadata without counting a hit', async () => {
        reflector.get.mockReturnValue(undefined);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
    });

    it('builds a handler-specific tracker and evaluates the selected policy', async () => {
        reflector.get.mockReturnValue({
            route: EnumRequestThrottleRoute.strict,
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            RequestThrottleOptionsMetaKey,
            login
        );
        expect(requestThrottleService.evaluate).toHaveBeenCalledWith(
            response,
            'route',
            'strict:UserController.login:203.0.113.10',
            policy
        );
    });
});
