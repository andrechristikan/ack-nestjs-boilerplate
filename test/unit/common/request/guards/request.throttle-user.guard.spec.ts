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
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { RequestThrottleOptionsMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import type {
    IRequestApp,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';

describe('RequestThrottleUserGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configGet =
        vi.fn<(key: string) => IRequestThrottlePolicy | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const requestThrottleService: MockProxy<RequestThrottleService> =
        mock<RequestThrottleService>();
    const policy = { ttlInMs: 1000, limit: 5, blockDurationInMs: 5000 };
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
    let guard: RequestThrottleUserGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(policy);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleUserGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
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
            expect(configGet).toHaveBeenCalledWith('request.throttle.user');
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

        it('throws a context-missing error when the user option is set and the request carries no authenticated user', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            Reflect.set(request, 'user', undefined);
            reflector.get.mockReturnValue({ user: true });
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);

            let thrown: unknown;
            try {
                await guard.canActivate(executionContext);
            } catch (caught) {
                thrown = caught;
            }

            expectRequestContextMissingWithKey(thrown, 'request.user');
            expect(requestThrottleService.evaluate).not.toHaveBeenCalled();
        });

        it('evaluates the user policy and activates when the request carries an authenticated user', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.user = user;
            const response: MockProxy<Response> = mock<Response>();
            reflector.get.mockReturnValue({ user: true });
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            httpArgumentsHost.getResponse.mockReturnValue(response);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
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
