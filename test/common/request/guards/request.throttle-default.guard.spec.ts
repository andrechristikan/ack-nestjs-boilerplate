import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
    ThrottlerModuleOptions,
    ThrottlerStorage,
} from '@nestjs/throttler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestThrottleDefaultGuard } from '@common/request/guards/request.throttle-default.guard';
import { RequestUtil } from '@common/request/utils/request.util';

describe('RequestThrottleDefaultGuard', () => {
    const increment = vi.fn<ThrottlerStorage['increment']>();
    const storage: ThrottlerStorage = { increment };
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
    const header = vi.fn();
    class TestController {}
    function list() {}
    let context: ExecutionContext;

    let guard: RequestThrottleDefaultGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context = createMock<ExecutionContext>({
            getHandler: () => list,
            getClass: () => TestController,
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({
                        ip: 'untrusted-value',
                        socket: { remoteAddress: '203.0.113.10' },
                        headers: {},
                    }),
                    getResponse: () => createMock({ header }),
                }),
        });
        increment.mockResolvedValue({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: false,
            timeToBlockExpire: 0,
        });
        guard = new RequestThrottleDefaultGuard(
            options,
            storage,
            new Reflector(),
            new RequestUtil()
        );
        await guard.onModuleInit();
    });

    it('uses the resolved client IP directly as the global throttler key', async () => {
        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(increment).toHaveBeenCalledWith(
            '203.0.113.10',
            60_000,
            10,
            30_000,
            'default'
        );
        expect(header).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    });
});
