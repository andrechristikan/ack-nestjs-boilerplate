import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestActorInterceptor } from '@common/request/interceptors/request.actor.interceptor';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { subscribeNext } from '@test/unit/helpers/test.unit.observable.helper';

describe('RequestActorInterceptor', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let interceptor: RequestActorInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestActorInterceptor,
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        interceptor = module.get(RequestActorInterceptor);
    });

    describe('intercept', () => {
        it('stamps the actor store when the request carries an authenticated user', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
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
            request.user = user;
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);

            const result = await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestActorStoreKey,
                'user-1'
            );
            expect(result).toBe('handled');
        });

        it('does not stamp the actor store when the request carries no user', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            Reflect.set(request, 'user', undefined);
            const callHandler: MockProxy<CallHandler> = mock<CallHandler>();
            callHandler.handle.mockReturnValue(of('handled'));
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);

            await subscribeNext(
                interceptor.intercept(executionContext, callHandler)
            );

            expect(requestStoreService.set).not.toHaveBeenCalled();
        });
    });
});
