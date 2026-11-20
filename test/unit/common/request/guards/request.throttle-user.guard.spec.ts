import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    RequestActorStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RequestThrottleUserGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    let configService: MockProxy<ConfigService>;
    const requestThrottleService: MockProxy<RequestThrottleService> =
        mock<RequestThrottleService>();
    const policy = { ttlInMs: 1000, limit: 5, blockDurationInMs: 5000 };
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: RequestThrottleUserGuard;

    beforeEach(async () => {
        configService = buildConfigService({
            'request.throttle.user': policy,
        });
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleUserGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
                { provide: RequestStoreService, useValue: requestStoreService },
                {
                    provide: RequestThrottleService,
                    useValue: requestThrottleService,
                },
            ],
        }).compile();
        guard = module.get(RequestThrottleUserGuard);
    });

    describe('canActivate', () => {
        it('reads the user throttle policy from the config service once, in the constructor', () => {
            expect(configService.get).toHaveBeenCalledWith(
                'request.throttle.user'
            );
        });

        it('activates with no evaluation when the handler carries no throttle options', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const handler = vi.fn();
            executionContext.getHandler.mockReturnValue(handler);
            reflector.get.mockReturnValue(undefined);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(reflector.get).toHaveBeenCalledWith(
                RequestThrottleOptionsMetaKey,
                handler
            );
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('activates with no evaluation when the throttle options carry no user option', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            reflector.get.mockReturnValue({ route: undefined });

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('throws a context-missing error when the user option is set and the store holds no context', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            reflector.get.mockReturnValue({ user: true });
            requestStoreService.get.mockReturnValue(null);
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);

            let thrown: unknown;
            try {
                await guard.canActivate(executionContext);
            } catch (caught) {
                thrown = caught;
            }

            expectRequestContextMissingWithKey(thrown, RequestActorStoreKey);
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('throws a context-missing error when the user option is set and the context holds no actor', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            reflector.get.mockReturnValue({ user: true });
            requestStoreService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                await guard.canActivate(executionContext);
            } catch (caught) {
                thrown = caught;
            }

            expectRequestContextMissingWithKey(thrown, RequestActorStoreKey);
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('evaluates the user policy and activates when the store holds the actor', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const response: MockProxy<Response> = mock<Response>();
            reflector.get.mockReturnValue({ user: true });
            requestStoreService.get.mockReturnValue('user-1');
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getResponse.mockReturnValue(response);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestActorStoreKey
            );
            expect(requestThrottleService.evaluate).toHaveBeenCalledWith(
                response,
                EnumRequestThrottleName.user,
                'user-1',
                policy
            );
        });
    });
});
