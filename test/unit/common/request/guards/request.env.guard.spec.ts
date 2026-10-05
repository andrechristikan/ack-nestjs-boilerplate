import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestEnvMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';

describe('RequestEnvGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configGet = vi.fn<(key: string) => EnumAppEnvironment | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    let guard: RequestEnvGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(EnumAppEnvironment.local);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestEnvGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = module.get(RequestEnvGuard);
    });

    describe('canActivate', () => {
        it('reads the app environment from the config service once, in the constructor', () => {
            expect(configGet).toHaveBeenCalledWith('app.env');
        });

        it('throws RequestEnvForbiddenException when no allowed environments are set', async () => {
            reflector.getAllAndOverride.mockReturnValue(undefined);

            const promise = guard.canActivate(executionContext);

            await expect(promise).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.envForbidden,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.envForbidden
                    ],
                messagePath: 'http.clientError.forbidden',
            });
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
                RequestEnvMetaKey,
                [executionContext.getHandler(), executionContext.getClass()]
            );
        });

        it('throws RequestEnvForbiddenException when the current environment is not allowed', async () => {
            reflector.getAllAndOverride.mockReturnValue([
                EnumAppEnvironment.production,
            ]);

            const promise = guard.canActivate(executionContext);

            await expect(promise).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.envForbidden,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.envForbidden
                    ],
                messagePath: 'http.clientError.forbidden',
            });
        });

        it('activates when the current environment is allowed', async () => {
            reflector.getAllAndOverride.mockReturnValue([
                EnumAppEnvironment.local,
                EnumAppEnvironment.development,
            ]);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
        });
    });
});
