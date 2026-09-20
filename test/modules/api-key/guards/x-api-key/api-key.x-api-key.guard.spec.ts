import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, type ApiKey } from '@generated/prisma-client';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';

describe('ApiKeyXApiKeyGuard', () => {
    const apiKeyDomain: MockProxy<ApiKeyDomain> = mock<ApiKeyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
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
        configGet.mockReturnValue('x-api-key');
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyGuard,
                { provide: ApiKeyDomain, useValue: apiKeyDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = moduleRef.get(ApiKeyXApiKeyGuard);
    });

    it('validates the configured header and stores only the resolved key', async () => {
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue({
            headers: { 'x-api-key': 'public-key:secret' },
        });
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);
        apiKeyDomain.validateXApiKey.mockResolvedValue(apiKey);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(apiKeyDomain.validateXApiKey).toHaveBeenCalledWith(
            'public-key:secret'
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ApiKeyStoreKey,
            apiKey
        );
    });

    it('passes an empty string to the domain when the header is absent', async () => {
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue({ headers: {} });
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);
        apiKeyDomain.validateXApiKey.mockResolvedValue(apiKey);

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(apiKeyDomain.validateXApiKey).toHaveBeenCalledWith('');
    });

    it('matches the configured header name case-insensitively', async () => {
        configGet.mockReturnValue('X-Custom-Key');
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyGuard,
                { provide: ApiKeyDomain, useValue: apiKeyDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        const customGuard = moduleRef.get(ApiKeyXApiKeyGuard);
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue({
            headers: { 'x-custom-key': 'custom-value' },
        });
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);
        apiKeyDomain.validateXApiKey.mockResolvedValue(apiKey);

        await expect(customGuard.canActivate(context)).resolves.toBe(true);

        expect(apiKeyDomain.validateXApiKey).toHaveBeenCalledWith(
            'custom-value'
        );
    });

    it('propagates the domain rejection unchanged and does not store a key', async () => {
        const error = new Error('invalid api key');
        const httpArguments: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();
        httpArguments.getRequest.mockReturnValue({
            headers: { 'x-api-key': 'bad' },
        });
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue(httpArguments);
        apiKeyDomain.validateXApiKey.mockRejectedValue(error);

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
