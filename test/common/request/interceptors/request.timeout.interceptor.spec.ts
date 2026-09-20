import { createMock } from '@golevelup/ts-vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { firstValueFrom, NEVER, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
} from '@common/request/constants/request.constant';
import { RequestTimeoutException } from '@common/request/exceptions/request.timeout.exception';
import { RequestTimeoutInterceptor } from '@common/request/interceptors/request.timeout.interceptor';

describe('RequestTimeoutInterceptor', () => {
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const reflector = createMock<Pick<Reflector, 'get'>>();
    const handler = vi.fn();
    let context: ExecutionContext;

    let interceptor: RequestTimeoutInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        context = createMock<ExecutionContext>({
            getType: () => 'http',
            getHandler: () => handler,
        });
        vi.useFakeTimers();
        configGet.mockReturnValue(1_000);
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
        const next = { handle: vi.fn(() => NEVER) } satisfies CallHandler;
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
        const next = { handle: vi.fn(() => NEVER) } satisfies CallHandler;
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
        const next = {
            handle: vi.fn(() => throwError(() => failure)),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(failure);
    });

    it('does not apply an HTTP timeout to another transport', async () => {
        const rpcContext = createMock<ExecutionContext>({
            getType: () => 'rpc',
        });
        const next = {
            handle: vi.fn(() => of('result')),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(rpcContext, next))
        ).resolves.toBe('result');
    });
});
