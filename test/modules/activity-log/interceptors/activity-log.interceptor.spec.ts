import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';

describe('ActivityLogInterceptor', () => {
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const request = {
        user: {
            userId: 'user-id',
        },
    };

    const buildContext = (
        type: string,
        httpRequest?: unknown
    ): MockProxy<ExecutionContext> => {
        const httpHost: MockProxy<
            ReturnType<ExecutionContext['switchToHttp']>
        > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
        httpHost.getRequest.mockReturnValue(httpRequest);
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        executionContext.getType.mockReturnValue(type);
        executionContext.switchToHttp.mockReturnValue(httpHost);

        return executionContext;
    };

    let interceptor: ActivityLogInterceptor;
    let context: ExecutionContext;

    beforeEach(() => {
        vi.resetAllMocks();
        activityLogDomain.flushStaged.mockResolvedValue(undefined);
        context = buildContext('http', request);
        interceptor = new ActivityLogInterceptor(activityLogDomain);
    });

    it('flushes all staged events after a successful HTTP response', async () => {
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(of('ok'));

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
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(throwError(() => error));

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(error);
        expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
            payloadUserId: 'user-id',
            isError: true,
        });
    });

    it('flushes anonymous HTTP requests with a null payload user', async () => {
        context = buildContext('http', { user: null });
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(of('ok'));

        await lastValueFrom(interceptor.intercept(context, next));

        expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
            payloadUserId: null,
            isError: false,
        });
    });

    it('preserves a successful response when flushing fails', async () => {
        activityLogDomain.flushStaged.mockRejectedValue(new Error('db down'));
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(of('ok'));

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('ok');
    });

    it('preserves the handler error when its error flush fails', async () => {
        const error = new Error('handler failed');
        activityLogDomain.flushStaged.mockRejectedValue(new Error('db down'));
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(throwError(() => error));

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(error);
    });

    it('passes through non-http contexts without flushing staged events', async () => {
        const rpcContext = buildContext('rpc');
        const next: MockProxy<CallHandler> = mock<CallHandler>();
        next.handle.mockReturnValue(of('ok'));

        await expect(
            lastValueFrom(interceptor.intercept(rpcContext, next))
        ).resolves.toBe('ok');
        expect(rpcContext.switchToHttp).not.toHaveBeenCalled();
        expect(activityLogDomain.flushStaged).not.toHaveBeenCalled();
    });
});
