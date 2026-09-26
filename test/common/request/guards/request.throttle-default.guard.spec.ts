import type { ExecutionContext, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
    ThrottlerModuleOptions,
    ThrottlerStorage,
} from '@nestjs/throttler';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestThrottleDefaultGuard } from '@common/request/guards/request.throttle-default.guard';
import { RequestUtil } from '@common/request/utils/request.util';
import type { Response } from 'express';

describe('RequestThrottleDefaultGuard', () => {
    const storage: MockProxy<ThrottlerStorage> = mock<ThrottlerStorage>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const requestUtil: MockProxy<RequestUtil> = mock<RequestUtil>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpContext: MockProxy<ReturnType<ExecutionContext['switchToHttp']>> =
        mock<ReturnType<ExecutionContext['switchToHttp']>>();
    const response: MockProxy<Response> = mock<Response>();
    const options: ThrottlerModuleOptions = {
        throttlers: [
            {
                name: 'default',
                ttl: 60_000,
                limit: 10,
                blockDuration: 30_000,
            },
        ],
    };
    const TestController =
        function TestController() {} as unknown as Type<unknown>;
    function list() {}
    let guard: RequestThrottleDefaultGuard;

    beforeEach(async () => {
        context.getHandler.mockReturnValue(list);
        context.getClass.mockReturnValue(TestController);
        context.switchToHttp.mockReturnValue(httpContext);
        httpContext.getRequest.mockReturnValue({
            ip: 'untrusted-value',
            socket: { remoteAddress: '203.0.113.10' },
            headers: {},
        });
        httpContext.getResponse.mockReturnValue(response);
        response.header.mockReturnValue(response);
        requestUtil.resolveThrottleTrackerIp.mockReturnValue('203.0.113.10');
        storage.increment.mockResolvedValue({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: false,
            timeToBlockExpire: 0,
        });
        guard = new RequestThrottleDefaultGuard(
            options,
            storage,
            reflector,
            requestUtil
        );
        await guard.onModuleInit();
    });

    it('uses the resolved client IP directly as the global throttler key', async () => {
        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(storage.increment).toHaveBeenCalledWith(
            '203.0.113.10',
            60_000,
            10,
            30_000,
            'default'
        );
        expect(response.header).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    });
});
