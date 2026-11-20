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
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RequestEnvGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    let configService: MockProxy<ConfigService>;
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    let guard: RequestEnvGuard;

    beforeEach(async () => {
        configService = buildConfigService({
            'app.env': EnumAppEnvironment.local,
        });
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
            expect(configService.get).toHaveBeenCalledWith('app.env');
        });

        it('throws RequestEnvNotAllowedException when the current environment is not allowed', async () => {
            reflector.getAllAndOverride.mockReturnValue([
                EnumAppEnvironment.production,
            ]);

            const promise = guard.canActivate(executionContext);

            await expect(promise).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.envNotAllowed,
            });
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
                RequestEnvMetaKey,
                [executionContext.getHandler(), executionContext.getClass()]
            );
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
