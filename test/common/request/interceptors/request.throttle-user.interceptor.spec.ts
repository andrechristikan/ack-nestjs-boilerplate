import { createMock } from '@golevelup/ts-vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    RequestThrottleHandledStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import { RequestThrottleUserInterceptor } from '@common/request/interceptors/request.throttle-user.interceptor';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import type { Response } from 'express';

describe('RequestThrottleUserInterceptor', () => {
    const policy = { ttlInMs: 60_000, limit: 100, blockDurationInMs: 60_000 };
    const reflector = {
        get: vi.fn<Reflector['get']>(),
    } satisfies Pick<Reflector, 'get'>;
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const requestStoreService: Pick<RequestStoreService, 'get' | 'set'> = {
        get: vi.fn(),
        set: vi.fn(),
    };
    const requestStoreGet = vi.mocked(requestStoreService.get);
    const requestStoreSet = vi.mocked(requestStoreService.set);
    const requestThrottleService = {
        evaluate: vi.fn<RequestThrottleService['evaluate']>(),
    } satisfies Pick<RequestThrottleService, 'evaluate'>;
    const response = createMock<Response>();
    const handler = vi.fn();
    const next = { handle: vi.fn(() => of('result')) } satisfies CallHandler;

    let request: IRequestApp<{ userId: string }>;
    let context: ExecutionContext;
    let interceptor: RequestThrottleUserInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(policy);
        request = createMock<IRequestApp<{ userId: string }>>({
            user: { userId: 'user-id' },
        });
        context = createMock<ExecutionContext>({
            getHandler: () => handler,
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                    getResponse: () => response,
                }),
        });
        next.handle.mockReturnValue(of('result'));

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleUserInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
                { provide: RequestStoreService, useValue: requestStoreService },
                {
                    provide: RequestThrottleService,
                    useValue: requestThrottleService,
                },
            ],
        }).compile();
        interceptor = moduleRef.get(RequestThrottleUserInterceptor);
    });

    it('evaluates the user limiter once before delegating', async () => {
        requestStoreGet.mockReturnValue(null);
        reflector.get.mockReturnValue({ user: true });

        await expect(
            firstValueFrom(await interceptor.intercept(context, next))
        ).resolves.toBe('result');

        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestThrottleHandledStoreKey,
            true
        );
        expect(reflector.get).toHaveBeenCalledWith(
            RequestThrottleOptionsMetaKey,
            handler
        );
        expect(requestThrottleService.evaluate).toHaveBeenCalledWith(
            response,
            'user',
            'user-id',
            policy
        );
    });

    it.each([
        ['already handled', true, { user: true }, true],
        ['not opted in', null, undefined, true],
        ['anonymous', null, { user: true }, false],
    ])(
        'does not evaluate when the request is %s',
        async (_name, handled, options, hasUser) => {
            requestStoreGet.mockReturnValue(handled);
            reflector.get.mockReturnValue(options);
            if (!hasUser)
                request = createMock<IRequestApp>({ user: undefined });

            await firstValueFrom(await interceptor.intercept(context, next));

            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        }
    );
});
