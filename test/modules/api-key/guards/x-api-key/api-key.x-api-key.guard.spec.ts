import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, type ApiKey } from '@generated/prisma-client';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';

describe('ApiKeyXApiKeyGuard', () => {
    const apiKeyService = {
        validateXApiKey: vi.fn<ApiKeyDomain['validateXApiKey']>(),
    } satisfies Pick<ApiKeyDomain, 'validateXApiKey'>;
    const requestStoreService = {
        set: vi.fn<RequestStoreService['set']>(),
    } satisfies Pick<RequestStoreService, 'set'>;
    const apiKey = {
        id: 'api-key-id',
        type: EnumApiKeyType.default,
        name: 'Public API',
        key: 'production_public-key',
        hash: 'stored-hash',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    } satisfies ApiKey;

    let guard: ApiKeyXApiKeyGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyGuard,
                { provide: ApiKeyDomain, useValue: apiKeyService },
                { provide: RequestStoreService, useValue: requestStoreService },
                {
                    provide: ConfigService,
                    useValue: new ConfigService({
                        'auth.xApiKey.header': 'x-api-key',
                    }),
                },
            ],
        }).compile();
        guard = moduleRef.get(ApiKeyXApiKeyGuard);
    });

    it('validates the configured header and stores only the resolved key', async () => {
        const context = createMock<ExecutionContext>({
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getRequest: () => ({
                        headers: { 'x-api-key': 'public-key:secret' },
                    }),
                }),
        });
        apiKeyService.validateXApiKey.mockResolvedValue(apiKey);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(apiKeyService.validateXApiKey).toHaveBeenCalledWith(
            'public-key:secret'
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ApiKeyStoreKey,
            apiKey
        );
    });
});
