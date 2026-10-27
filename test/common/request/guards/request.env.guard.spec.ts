import type { ExecutionContext, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestEnvMetaKey } from '@common/request/constants/request.constant';
import { RequestEnvForbiddenException } from '@common/request/exceptions/request.env-forbidden.exception';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';

describe('RequestEnvGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const handler = vi.fn();
    const controller = {} as Type<unknown>;
    let guard: RequestEnvGuard;

    beforeEach(async () => {
        context.getType.mockReturnValue('http');
        context.getHandler.mockReturnValue(handler);
        context.getClass.mockReturnValue(controller);
        vi.mocked(configService.get).mockReturnValue(EnumAppEnvironment.local);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestEnvGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(RequestEnvGuard);
    });

    it('allows a route when the current environment is declared', async () => {
        reflector.getAllAndOverride.mockReturnValue([EnumAppEnvironment.local]);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            RequestEnvMetaKey,
            [handler, controller]
        );
    });

    it.each([undefined, [EnumAppEnvironment.production]])(
        'denies a route whose environment metadata is %s',
        async required => {
            reflector.getAllAndOverride.mockReturnValue(required);

            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
                RequestEnvForbiddenException
            );
        }
    );
});
