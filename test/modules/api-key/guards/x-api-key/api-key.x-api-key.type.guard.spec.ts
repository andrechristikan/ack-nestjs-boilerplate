import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, type ApiKey } from '@generated/prisma-client';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';

describe('ApiKeyXApiKeyTypeGuard', () => {
    const reflector = {
        getAllAndOverride: vi.fn<Reflector['getAllAndOverride']>(),
    } satisfies Pick<Reflector, 'getAllAndOverride'>;
    const apiKeyService = {
        validateXApiKeyTypeGuard:
            vi.fn<ApiKeyDomain['validateXApiKeyTypeGuard']>(),
    } satisfies Pick<ApiKeyDomain, 'validateXApiKeyTypeGuard'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
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
                { provide: ApiKeyDomain, useValue: apiKeyService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(ApiKeyXApiKeyTypeGuard);
    });

    it('delegates metadata and request-state authorization to the service', async () => {
        const handler = () => undefined;
        class Host {}
        const context = createMock<ExecutionContext>({
            getHandler: () => handler,
            getClass: () => Host,
        });
        reflector.getAllAndOverride.mockReturnValue([EnumApiKeyType.system]);
        requestStoreGet.mockReturnValue(apiKey);
        apiKeyService.validateXApiKeyTypeGuard.mockReturnValue(true);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            ApiKeyXTypeMetaKey,
            [handler, Host]
        );
        expect(requestStoreGet).toHaveBeenCalledWith(ApiKeyStoreKey);
        expect(apiKeyService.validateXApiKeyTypeGuard).toHaveBeenCalledWith(
            apiKey,
            [EnumApiKeyType.system]
        );
    });
});
