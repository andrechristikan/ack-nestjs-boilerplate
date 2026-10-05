import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

describe('ApiKeyXApiKeyGuard', () => {
    const apiKeyDomain: MockProxy<ApiKeyDomain> = mock<ApiKeyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
    };

    let guard: ApiKeyXApiKeyGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue('X-Api-Key');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyGuard,
                { provide: ApiKeyDomain, useValue: apiKeyDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        guard = module.get(ApiKeyXApiKeyGuard);
    });

    describe('canActivate', () => {
        it('reads the lowercased header name from the config service once, in the constructor', () => {
            expect(configGet).toHaveBeenCalledWith('auth.xApiKey.header');
        });

        it('validates the header value and stores the resolved api key', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { 'x-api-key': 'local_abc123:secret-1' };
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            apiKeyDomain.validateXApiKey.mockResolvedValue(apiKey);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(apiKeyDomain.validateXApiKey).toHaveBeenCalledWith(
                'local_abc123:secret-1'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ApiKeyStoreKey,
                apiKey
            );
        });

        it('passes an empty string when the header is absent', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            apiKeyDomain.validateXApiKey.mockResolvedValue(apiKey);

            await guard.canActivate(executionContext);

            expect(apiKeyDomain.validateXApiKey).toHaveBeenCalledWith('');
        });
    });
});
