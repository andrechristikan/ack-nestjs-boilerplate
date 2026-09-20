import type { ExecutionContext, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, type ApiKey } from '@generated/prisma-client';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';

describe('ApiKeyXApiKeyTypeGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const apiKeyDomain: MockProxy<ApiKeyDomain> = mock<ApiKeyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const apiKey = {
        id: 'api-key-id',
        type: EnumApiKeyType.system,
        name: 'System',
        key: 'production_system',
        hash: 'stored-hash',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    } satisfies ApiKey;

    let guard: ApiKeyXApiKeyTypeGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyTypeGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ApiKeyDomain, useValue: apiKeyDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(ApiKeyXApiKeyTypeGuard);
    });

    it('delegates metadata and request-state authorization to the service', async () => {
        const handler = () => undefined;
        const classRef = {} as Type<unknown>;
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(handler);
        context.getClass.mockReturnValue(classRef);
        reflector.getAllAndOverride.mockReturnValue([EnumApiKeyType.system]);
        requestStoreService.get.mockReturnValue(apiKey);
        apiKeyDomain.validateXApiKeyTypeGuard.mockReturnValue(true);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            ApiKeyXTypeMetaKey,
            [handler, classRef]
        );
        expect(requestStoreService.get).toHaveBeenCalledWith(ApiKeyStoreKey);
        expect(apiKeyDomain.validateXApiKeyTypeGuard).toHaveBeenCalledWith(
            apiKey,
            [EnumApiKeyType.system]
        );
    });

    it('returns false when the domain rejects the key type', async () => {
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(() => undefined);
        context.getClass.mockReturnValue({} as Type<unknown>);
        reflector.getAllAndOverride.mockReturnValue([EnumApiKeyType.default]);
        requestStoreService.get.mockReturnValue(apiKey);
        apiKeyDomain.validateXApiKeyTypeGuard.mockReturnValue(false);

        await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('propagates the domain error unchanged', async () => {
        const error = new Error('key type forbidden');
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(() => undefined);
        context.getClass.mockReturnValue({} as Type<unknown>);
        reflector.getAllAndOverride.mockReturnValue([EnumApiKeyType.system]);
        requestStoreService.get.mockReturnValue(apiKey);
        apiKeyDomain.validateXApiKeyTypeGuard.mockImplementation(() => {
            throw error;
        });

        await expect(guard.canActivate(context)).rejects.toBe(error);
    });

    it('hands null to the domain when no api key is stored', async () => {
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(() => undefined);
        context.getClass.mockReturnValue({} as Type<unknown>);
        reflector.getAllAndOverride.mockReturnValue([EnumApiKeyType.system]);
        requestStoreService.get.mockReturnValue(null);
        apiKeyDomain.validateXApiKeyTypeGuard.mockReturnValue(true);

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(apiKeyDomain.validateXApiKeyTypeGuard).toHaveBeenCalledWith(
            null,
            [EnumApiKeyType.system]
        );
    });
});
