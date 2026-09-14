import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogActionMetaKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';

describe('ActivityLogInterceptor', () => {
    const reflector = {
        get: vi.fn<Reflector['get']>(),
    } satisfies Pick<Reflector, 'get'>;
    const activityLogService = {
        create: vi.fn<ActivityLogDomain['create']>(),
    } satisfies Pick<ActivityLogDomain, 'create'>;
    const request = {
        user: {
            userId: 'user-id',
        },
    };
    const handler = () => undefined;

    let interceptor: ActivityLogInterceptor;
    let context: ExecutionContext;

    beforeEach(async () => {
        vi.resetAllMocks();
        reflector.get.mockReturnValue(EnumActivityLogAction.userUpdateProfile);
        activityLogService.create.mockResolvedValue(undefined);
        context = createMock<ExecutionContext>({
            getType: () => 'http',
            getHandler: () => handler,
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                }),
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: ActivityLogDomain, useValue: activityLogService },
            ],
        }).compile();

        interceptor = moduleRef.get(ActivityLogInterceptor);
    });

    it('triggers the configured activity log action on successful HTTP responses', async () => {
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('ok');
        expect(reflector.get).toHaveBeenCalledWith(
            ActivityLogActionMetaKey,
            handler
        );
        expect(activityLogService.create).toHaveBeenCalledWith(
            'user-id',
            EnumActivityLogAction.userUpdateProfile,
            null
        );
    });

    it('triggers the configured activity log action and rethrows handler errors', async () => {
        const error = new Error('failed');
        const next = {
            handle: vi
                .fn<CallHandler['handle']>()
                .mockReturnValue(throwError(() => error)),
        } satisfies CallHandler;

        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBe(error);
        expect(activityLogService.create).toHaveBeenCalledWith(
            'user-id',
            EnumActivityLogAction.userUpdateProfile,
            error
        );
    });

    it('skips logging when the request has no authenticated user', async () => {
        context = createMock<ExecutionContext>({
            getHandler: () => handler,
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({ user: null }),
                }),
        });
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await lastValueFrom(interceptor.intercept(context, next));

        expect(activityLogService.create).not.toHaveBeenCalled();
    });

    it('passes through non-http contexts without reading activity metadata', async () => {
        const rpcContext = createMock<ExecutionContext>({
            getType: () => 'rpc',
        });
        const next = {
            handle: vi.fn<CallHandler['handle']>().mockReturnValue(of('ok')),
        } satisfies CallHandler;

        await lastValueFrom(interceptor.intercept(rpcContext, next));

        expect(rpcContext.switchToHttp).not.toHaveBeenCalled();
        expect(reflector.get).not.toHaveBeenCalled();
    });
});
