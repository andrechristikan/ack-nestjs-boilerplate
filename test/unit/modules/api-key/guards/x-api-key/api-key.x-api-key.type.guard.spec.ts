import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

describe('ApiKeyXApiKeyTypeGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();
    const controllerClass = {} as unknown as Type<unknown>;
    const handler = vi.fn();

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

    let guard: ApiKeyXApiKeyTypeGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        executionContext.getHandler.mockReturnValue(handler);
        executionContext.getClass.mockReturnValue(controllerClass);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyTypeGuard,
                { provide: Reflector, useValue: reflector },
                { provide: ApiKeyService, useValue: apiKeyService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(ApiKeyXApiKeyTypeGuard);
    });

    describe('canActivate', () => {
        it('reads the required types and the stored api key, then delegates to the domain', async () => {
            reflector.getAllAndOverride.mockReturnValue([
                EnumApiKeyType.default,
            ]);
            requestStoreService.get.mockReturnValue(apiKey);
            apiKeyService.validateXApiKeyTypeGuard.mockReturnValue(true);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
                ApiKeyXTypeMetaKey,
                [handler, controllerClass]
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                ApiKeyStoreKey
            );
            expect(apiKeyService.validateXApiKeyTypeGuard).toHaveBeenCalledWith(
                apiKey,
                [EnumApiKeyType.default]
            );
        });

        it('throws ApiKeyGuardMissingException before the domain call when the api key store is empty', async () => {
            reflector.getAllAndOverride.mockReturnValue([
                EnumApiKeyType.default,
            ]);
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.guardMissing
                    ],
                messagePath: 'apiKey.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
            expect(
                apiKeyService.validateXApiKeyTypeGuard
            ).not.toHaveBeenCalled();
        });

        it('propagates a thrown exception from the domain', async () => {
            reflector.getAllAndOverride.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(apiKey);
            const error = new Error('predefined not found');
            apiKeyService.validateXApiKeyTypeGuard.mockImplementation(() => {
                throw error;
            });

            await expect(guard.canActivate(executionContext)).rejects.toBe(
                error
            );
        });
    });
});
