import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestEnvMetaKey } from '@common/request/constants/request.constant';
import { RequestEnvForbiddenException } from '@common/request/exceptions/request.env-forbidden.exception';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';

describe('RequestEnvGuard', () => {
    const reflector = createMock<Pick<Reflector, 'getAllAndOverride'>>();
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const handler = vi.fn();
    class TestController {}
    let context: ExecutionContext;

    let guard: RequestEnvGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context = createMock<ExecutionContext>({
            getType: () => 'http',
            getHandler: () => handler,
            getClass: () => TestController,
        });
        configGet.mockReturnValue(EnumAppEnvironment.local);

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
            [handler, TestController]
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
