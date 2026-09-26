import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestActorInterceptor } from '@common/request/interceptors/request.actor.interceptor';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestActorInterceptor', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const next: MockProxy<CallHandler> = mock<CallHandler>();

    let interceptor: RequestActorInterceptor;

    beforeEach(async () => {
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
        const request: MockProxy<IRequestApp> = mock<IRequestApp>({
            user: { userId: 'user-id' },
        });
        const httpContext: MockProxy<
            ReturnType<ExecutionContext['switchToHttp']>
        > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        httpContext.getRequest.mockReturnValue(request);
        context.switchToHttp.mockReturnValue(httpContext);

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('result');
        expect(requestStoreService.set).toHaveBeenCalledWith(
            RequestActorStoreKey,
            'user-id'
        );
    });

    it('does not store an actor for an anonymous request', async () => {
        const request: MockProxy<IRequestApp> = mock<IRequestApp>({
            user: undefined,
        });
        const httpContext: MockProxy<
            ReturnType<ExecutionContext['switchToHttp']>
        > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        httpContext.getRequest.mockReturnValue(request);
        context.switchToHttp.mockReturnValue(httpContext);

        await firstValueFrom(interceptor.intercept(context, next));

        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
