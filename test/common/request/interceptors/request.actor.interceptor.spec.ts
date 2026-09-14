import { createMock } from '@golevelup/ts-vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestActorInterceptor } from '@common/request/interceptors/request.actor.interceptor';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestActorInterceptor', () => {
    const requestStoreService = createMock<Pick<RequestStoreService, 'set'>>();
    const requestStoreSet = requestStoreService.set;
    const next = { handle: vi.fn(() => of('result')) } satisfies CallHandler;

    let interceptor: RequestActorInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        next.handle.mockReturnValue(of('result'));
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestActorInterceptor,
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        interceptor = moduleRef.get(RequestActorInterceptor);
    });

    it('stores the authenticated actor and passes through the handler result', async () => {
        const request = createMock<IRequestApp>({
            user: { userId: 'user-id' },
        });
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                }),
        });

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('result');
        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestActorStoreKey,
            'user-id'
        );
    });

    it('does not store an actor for an anonymous request', async () => {
        const request = createMock<IRequestApp>({ user: undefined });
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => request,
                }),
        });

        await firstValueFrom(interceptor.intercept(context, next));

        expect(requestStoreSet).not.toHaveBeenCalled();
    });
});
