import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    ApiKeyContextStoreKey,
    ApiKeyHeaderName,
} from '@modules/api-key/constants/api-key.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import type { ApiKey } from '@generated/prisma-client/client';
import { buildApiKey } from '@test/unit/helpers/test.unit.request.helper';

describe('ApiKeyXApiKeyGuard', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const apiKey: ApiKey = buildApiKey();

    let guard: ApiKeyXApiKeyGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyGuard,
                { provide: ApiKeyService, useValue: apiKeyService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(ApiKeyXApiKeyGuard);
    });

    describe('canActivate', () => {
        it('validates the header value and stores the resolved api key as the api key context', async () => {
            const executionContext: MockProxy<ExecutionContext> =
                mock<ExecutionContext>();
            const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
                mock<HttpArgumentsHost>();
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { [ApiKeyHeaderName]: 'local_abc123:secret-1' };
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue(request);
            apiKeyService.validateXApiKey.mockResolvedValue(apiKey);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(apiKeyService.validateXApiKey).toHaveBeenCalledWith(
                'local_abc123:secret-1'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ApiKeyContextStoreKey,
                { apiKey }
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
            apiKeyService.validateXApiKey.mockResolvedValue(apiKey);

            await guard.canActivate(executionContext);

            expect(apiKeyService.validateXApiKey).toHaveBeenCalledWith('');
        });
    });
});
