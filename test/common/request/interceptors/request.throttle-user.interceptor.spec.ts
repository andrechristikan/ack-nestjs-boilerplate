import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

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
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestThrottleService: MockProxy<RequestThrottleService> =
        mock<RequestThrottleService>();
    const response: MockProxy<Response> = mock<Response>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpContext: MockProxy<ReturnType<ExecutionContext['switchToHttp']>> =
        mock<ReturnType<ExecutionContext['switchToHttp']>>();
    const next: MockProxy<CallHandler> = mock<CallHandler>();
    const handler = vi.fn();

    let request: MockProxy<IRequestApp<{ userId: string }>>;
    let interceptor: RequestThrottleUserInterceptor;

    beforeEach(async () => {
        vi.mocked(configService.get).mockReturnValue(policy);
        request = mock<IRequestApp<{ userId: string }>>({
            user: { userId: 'user-id' },
        });
        context.getHandler.mockReturnValue(handler);
        context.switchToHttp.mockReturnValue(httpContext);
        httpContext.getRequest.mockImplementation(() => request);
        httpContext.getResponse.mockReturnValue(response);
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
        requestStoreService.get.mockReturnValue(null);
        reflector.get.mockReturnValue({ user: true });

        await expect(
            firstValueFrom(await interceptor.intercept(context, next))
        ).resolves.toBe('result');

        expect(requestStoreService.set).toHaveBeenCalledWith(
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
            requestStoreService.get.mockReturnValue(handled);
            reflector.get.mockReturnValue(options);
            if (!hasUser)
                request = mock<IRequestApp<{ userId: string }>>({
                    user: undefined,
                });

            await firstValueFrom(await interceptor.intercept(context, next));

            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        }
    );
});
