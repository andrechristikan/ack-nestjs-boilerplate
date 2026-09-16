import { createMock } from '@golevelup/ts-vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';

describe('ActivityLogInterceptor', () => {
    const activityLogDomain = createMock<ActivityLogDomain>();
    const request = {
        user: {
            userId: 'user-id',
        },
    };

    let interceptor: ActivityLogInterceptor;
    let context: ExecutionContext;

    beforeEach(() => {
        vi.resetAllMocks();
        activityLogDomain.flushStaged.mockResolvedValue(undefined);
        context = createMock<ExecutionContext>({
            getType: () => 'http',
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                }),
        });
        interceptor = new ActivityLogInterceptor(activityLogDomain);
    });

    it('flushes all staged events after a successful HTTP response', async () => {
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('ok');
        expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
            payloadUserId: 'user-id',
            isError: false,
        });
    });

    it('flushes error-enabled events and rethrows the handler error', async () => {
        const error = new Error('failed');
        const next = {
            handle: vi
                .fn<CallHandler['handle']>()
                .mockReturnValue(throwError(() => error)),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(error);
        expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
            payloadUserId: 'user-id',
            isError: true,
        });
    });

    it('flushes anonymous HTTP requests with a null payload user', async () => {
        context = createMock<ExecutionContext>({
            getType: () => 'http',
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({ user: null }),
                }),
        });
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await lastValueFrom(interceptor.intercept(context, next));

        expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
            payloadUserId: null,
            isError: false,
        });
    });

    it('preserves a successful response when flushing fails', async () => {
        activityLogDomain.flushStaged.mockRejectedValue(new Error('db down'));
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('ok');
    });

    it('preserves the handler error when its error flush fails', async () => {
        const error = new Error('handler failed');
        activityLogDomain.flushStaged.mockRejectedValue(new Error('db down'));
        const next = {
            handle: vi
                .fn<CallHandler['handle']>()
                .mockReturnValue(throwError(() => error)),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(error);
    });

    it('passes through non-http contexts without flushing staged events', async () => {
        const rpcContext = createMock<ExecutionContext>({
            getType: () => 'rpc',
        });
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(rpcContext, next))
        ).resolves.toBe('ok');
        expect(rpcContext.switchToHttp).not.toHaveBeenCalled();
        expect(activityLogDomain.flushStaged).not.toHaveBeenCalled();
    });
});
