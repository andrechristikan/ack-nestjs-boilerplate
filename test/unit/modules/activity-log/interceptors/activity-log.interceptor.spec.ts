import { HttpStatus, NotFoundException } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';
import {
    buildErrorObservable,
    subscribeError,
    subscribeNext,
} from '@test/unit/helpers/test.unit.observable.helper';

describe('ActivityLogInterceptor', () => {
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    const user: IAuthJwtAccessTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        email: 'jane@example.com',
        username: 'jane',
        userId: 'user-1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
        roleId: 'role-1',
    };

    let interceptor: ActivityLogInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogInterceptor,
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        interceptor = module.get(ActivityLogInterceptor);
    });

    describe('intercept', () => {
        it('passes through a non-http context without flushing', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            executionContext.getType.mockReturnValue('rpc');
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(result).toBe('handled');
            expect(activityLogDomain.flushStaged).not.toHaveBeenCalled();
        });

        it('flushes every staged activity log with the authenticated user on success', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.user = user;
            executionContext.getType.mockReturnValue('http');
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            activityLogDomain.flushStaged.mockResolvedValue(undefined);

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(result).toBe('handled');
            expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
                payloadUserId: 'user-1',
                isError: false,
            });
        });

        it('flushes with a null payload user when the request carries none', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            Reflect.set(request, 'user', undefined);
            executionContext.getType.mockReturnValue('http');
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            activityLogDomain.flushStaged.mockResolvedValue(undefined);

            await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
                payloadUserId: null,
                isError: false,
            });
        });

        it('swallows a flush failure on success without changing the handler result', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.user = user;
            executionContext.getType.mockReturnValue('http');
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            activityLogDomain.flushStaged.mockRejectedValue(
                new Error('flush failed')
            );

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(result).toBe('handled');
        });

        it('flushes only onError activity logs and wraps a non-typed error in AppUnknownException on failure', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.user = user;
            executionContext.getType.mockReturnValue('http');
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const handlerError = new Error('handler failed');
            callHandler.handle.mockReturnValue(
                buildErrorObservable(handlerError)
            );
            activityLogDomain.flushStaged.mockResolvedValue(undefined);

            const caught = await subscribeError(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(caught).toBeInstanceOf(AppUnknownException);
            expect(caught).toMatchObject({ rawError: handlerError });
            expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
                payloadUserId: 'user-1',
                isError: true,
            });
        });

        it('flushes onError activity logs and rethrows an AppBaseException unchanged', async () => {
            const executionContext = buildHttpExecutionContext({ user });
            executionContext.getType.mockReturnValue('http');
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const handlerError = new DatabaseUnavailableException();
            callHandler.handle.mockReturnValue(
                buildErrorObservable(handlerError)
            );
            activityLogDomain.flushStaged.mockResolvedValue(undefined);

            const caught = await subscribeError(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(caught).toBe(handlerError);
            expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
                payloadUserId: 'user-1',
                isError: true,
            });
        });

        it('flushes onError activity logs and rethrows an HttpException unchanged', async () => {
            const executionContext = buildHttpExecutionContext({ user });
            executionContext.getType.mockReturnValue('http');
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const handlerError = new NotFoundException();
            callHandler.handle.mockReturnValue(
                buildErrorObservable(handlerError)
            );
            activityLogDomain.flushStaged.mockResolvedValue(undefined);

            const caught = await subscribeError(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(caught).toBe(handlerError);
            expect(caught).toMatchObject({ status: HttpStatus.NOT_FOUND });
        });

        it('swallows a flush failure on error and still wraps the original error', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.user = user;
            executionContext.getType.mockReturnValue('http');
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            const handlerError = new Error('handler failed');
            callHandler.handle.mockReturnValue(
                buildErrorObservable(handlerError)
            );
            activityLogDomain.flushStaged.mockRejectedValue(
                new Error('flush failed')
            );

            const caught = await subscribeError(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(caught).toBeInstanceOf(AppUnknownException);
            expect(caught).toMatchObject({ rawError: handlerError });
        });
    });

    describe('flushSafe', () => {
        it('flushes staged activity logs for the given payload user and error flag', async () => {
            activityLogDomain.flushStaged.mockResolvedValue(undefined);

            await interceptor['flushSafe']('user-1', false);

            expect(activityLogDomain.flushStaged).toHaveBeenCalledWith({
                payloadUserId: 'user-1',
                isError: false,
            });
        });

        it('swallows a domain failure instead of throwing', async () => {
            activityLogDomain.flushStaged.mockRejectedValue(
                new Error('flush failed')
            );

            await expect(
                interceptor['flushSafe'](null, true)
            ).resolves.toBeUndefined();
        });
    });
});
