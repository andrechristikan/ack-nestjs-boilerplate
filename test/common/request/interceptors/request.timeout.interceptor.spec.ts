import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { firstValueFrom, NEVER, of, throwError } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
} from '@common/request/constants/request.constant';
import { RequestTimeoutException } from '@common/request/exceptions/request.timeout.exception';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';

describe('RequestTimeoutInterceptor', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const handler = vi.fn();

    let interceptor: RequestTimeoutInterceptor;

    beforeEach(async () => {
        context.getType.mockReturnValue('http');
        context.getHandler.mockReturnValue(handler);
        vi.useFakeTimers();
        vi.mocked(configService.get).mockReturnValue(1_000);
        reflector.get.mockReturnValue(undefined);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestTimeoutInterceptor,
                { provide: ConfigService, useValue: configService },
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();
        interceptor = moduleRef.get(RequestTimeoutInterceptor);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('maps the global timeout boundary to RequestTimeoutException', async () => {
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(NEVER);
        const result = firstValueFrom(interceptor.intercept(context, next));
        const assertion = expect(result).rejects.toBeInstanceOf(
            RequestTimeoutException
        );

        await vi.advanceTimersByTimeAsync(1_001);

        await assertion;
    });

    it('uses the route timeout override when declared', async () => {
        reflector.get.mockImplementation(key => {
            if (key === RequestCustomTimeoutMetaKey) return true;
            if (key === RequestCustomTimeoutValueMetaKey) return '2s';
            return undefined;
        });
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(NEVER);
        const result = firstValueFrom(interceptor.intercept(context, next));
        const assertion = expect(result).rejects.toBeInstanceOf(
            RequestTimeoutException
        );
        let settled = false;
        void result.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            }
        );

        await vi.advanceTimersByTimeAsync(1_001);
        await Promise.resolve();
        expect(settled).toBe(false);

        await vi.advanceTimersByTimeAsync(1_000);
        await assertion;
    });

    it('propagates non-timeout failures unchanged', async () => {
        const failure = new Error('handler failed');
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(throwError(() => failure));

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(failure);
    });

    it('does not apply an HTTP timeout to another transport', async () => {
        const rpcContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        rpcContext.getType.mockReturnValue('rpc');
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(of('result'));

        await expect(
            firstValueFrom(interceptor.intercept(rpcContext, next))
        ).resolves.toBe('result');
    });
});
