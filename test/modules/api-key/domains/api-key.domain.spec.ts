import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumApiKeyType, type ApiKey } from '@generated/prisma-client';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';
import { ApiKeyXApiKeyPredefinedNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-predefined-not-found.exception';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

describe('ApiKeyDomain', () => {
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;
    const apiKeyUtil = {
        isActive: vi.fn<ApiKeyUtil['isActive']>(),
        isExpired: vi.fn<ApiKeyUtil['isExpired']>(),
        isValid: vi.fn<ApiKeyUtil['isValid']>(),
        validateType: vi.fn<ApiKeyUtil['validateType']>(),
        mapActivityLogMetadata: vi.fn<ApiKeyUtil['mapActivityLogMetadata']>(),
    } satisfies Pick<
        ApiKeyUtil,
        | 'isActive'
        | 'isExpired'
        | 'isValid'
        | 'validateType'
        | 'mapActivityLogMetadata'
    >;
    const apiKeyCredentialService = {
        createSecret: vi.fn<ApiKeyCredentialUtil['createSecret']>(),
        createHash: vi.fn<ApiKeyCredentialUtil['createHash']>(),
        validateCredential: vi.fn<ApiKeyCredentialUtil['validateCredential']>(),
    } satisfies Pick<
        ApiKeyCredentialUtil,
        'createSecret' | 'createHash' | 'validateCredential'
    >;
    const apiKeyCacheService = {
        getCacheByKey: vi.fn<ApiKeyCache['getCacheByKey']>(),
        setCacheByKey: vi.fn<ApiKeyCache['setCacheByKey']>(),
        deleteCacheByKey: vi.fn<ApiKeyCache['deleteCacheByKey']>(),
    } satisfies Pick<
        ApiKeyCache,
        'getCacheByKey' | 'setCacheByKey' | 'deleteCacheByKey'
    >;
    const apiKeyRepository = {
        findOneById: vi.fn<ApiKeyRepository['findOneById']>(),
        findOneByKey: vi.fn<ApiKeyRepository['findOneByKey']>(),
        updateStatus: vi.fn<ApiKeyRepository['updateStatus']>(),
        updateHash: vi.fn<ApiKeyRepository['updateHash']>(),
    } satisfies Pick<
        ApiKeyRepository,
        'findOneById' | 'findOneByKey' | 'updateStatus' | 'updateHash'
    >;
    const requestStoreService = {
        merge: vi.fn<RequestStoreService['merge']>(),
    } satisfies Pick<RequestStoreService, 'merge'>;

    const now = new Date('2026-01-01T12:00:00.000Z');
    const apiKey = {
        id: 'api-key-id',
        type: EnumApiKeyType.default,
        name: 'Public API',
        key: 'production_public-key',
        hash: 'stored-hash',
        isActive: true,
        startAt: new Date('2025-01-01T00:00:00.000Z'),
        endAt: new Date('2027-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies ApiKey;

    let service: ApiKeyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue({
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            apiKeyType: apiKey.type,
            timestamp: apiKey.updatedAt,
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyDomain,
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                {
                    provide: ApiKeyCredentialUtil,
                    useValue: apiKeyCredentialService,
                },
                { provide: ApiKeyCache, useValue: apiKeyCacheService },
                { provide: ApiKeyRepository, useValue: apiKeyRepository },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(ApiKeyDomain);
    });

    describe('findOneActiveByKeyAndCache', () => {
        it('returns a cache hit without querying persistence', async () => {
            apiKeyCacheService.getCacheByKey.mockResolvedValue(apiKey);

            await expect(
                service.findOneActiveByKeyAndCache(apiKey.key)
            ).resolves.toBe(apiKey);
            expect(apiKeyRepository.findOneByKey).not.toHaveBeenCalled();
        });

        it('caches and returns a persistence hit', async () => {
            apiKeyCacheService.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(apiKey);

            await expect(
                service.findOneActiveByKeyAndCache(apiKey.key)
            ).resolves.toBe(apiKey);
            expect(apiKeyCacheService.setCacheByKey).toHaveBeenCalledWith(
                apiKey.key,
                apiKey
            );
        });
    });

    describe('validateXApiKey', () => {
        it.each([null, '', '   '])(
            'rejects a missing credential header',
            async header => {
                await expect(
                    service.validateXApiKey(header)
                ).rejects.toBeInstanceOf(ApiKeyXApiKeyRequiredException);
            }
        );

        it.each(['key', 'key:', ':secret', 'key:secret:extra'])(
            'rejects malformed credential %s',
            async header => {
                await expect(
                    service.validateXApiKey(header)
                ).rejects.toBeInstanceOf(ApiKeyXApiKeyInvalidException);
            }
        );

        it('rejects an unknown public key before secret verification', async () => {
            apiKeyCacheService.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(null);

            await expect(
                service.validateXApiKey('unknown:secret')
            ).rejects.toBeInstanceOf(ApiKeyXApiKeyNotFoundException);
            expect(
                apiKeyCredentialService.validateCredential
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['secret mismatch', false, true],
            ['inactive or out-of-window key', true, false],
        ])('rejects a %s', async (_case, credentialValid, keyValid) => {
            apiKeyCacheService.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialService.validateCredential.mockReturnValue(
                credentialValid
            );
            apiKeyUtil.isValid.mockReturnValue(keyValid);

            await expect(
                service.validateXApiKey(`${apiKey.key}:secret`)
            ).rejects.toBeInstanceOf(ApiKeyXApiKeyInvalidException);
        });

        it('returns an active in-window key with a valid secret', async () => {
            apiKeyCacheService.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialService.validateCredential.mockReturnValue(true);
            apiKeyUtil.isValid.mockReturnValue(true);

            await expect(
                service.validateXApiKey(`${apiKey.key}:secret`)
            ).resolves.toBe(apiKey);
            expect(
                apiKeyCredentialService.validateCredential
            ).toHaveBeenCalledWith(apiKey.key, 'secret', apiKey);
        });
    });

    describe('administration', () => {
        it('rejects a status change for an expired key', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(true);

            await expect(
                service.updateStatusByAdmin(apiKey.id, false)
            ).rejects.toBeInstanceOf(ApiKeyExpiredException);
            expect(apiKeyRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('updates status and invalidates the cached credential', async () => {
            const updated = { ...apiKey, isActive: false };
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(false);
            apiKeyRepository.updateStatus.mockResolvedValue(updated);

            await expect(
                service.updateStatusByAdmin(apiKey.id, false)
            ).resolves.toBe(updated);
            expect(apiKeyRepository.updateStatus).toHaveBeenCalledWith(
                apiKey.id,
                { isActive: false }
            );
            expect(apiKeyCacheService.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
        });

        it('rotates the secret hash and invalidates the old cached credential', async () => {
            const updated = { ...apiKey, hash: 'new-hash' };
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            apiKeyCredentialService.createSecret.mockReturnValue('new-secret');
            apiKeyCredentialService.createHash.mockReturnValue('new-hash');
            apiKeyRepository.updateHash.mockResolvedValue(updated);

            await expect(service.resetByAdmin(apiKey.id)).resolves.toEqual({
                apiKey: updated,
                secret: 'new-secret',
            });
            expect(apiKeyCredentialService.createHash).toHaveBeenCalledWith(
                apiKey.key,
                'new-secret'
            );
            expect(apiKeyCacheService.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
        });
    });

    describe('validateXApiKeyTypeGuard', () => {
        it('rejects a route without predefined allowed key types', () => {
            expect(() => service.validateXApiKeyTypeGuard(apiKey, [])).toThrow(
                ApiKeyXApiKeyPredefinedNotFoundException
            );
        });

        it('rejects a key outside the route allow-list', () => {
            apiKeyUtil.validateType.mockReturnValue(false);

            expect(() =>
                service.validateXApiKeyTypeGuard(apiKey, [
                    EnumApiKeyType.system,
                ])
            ).toThrow(ApiKeyXApiKeyForbiddenException);
        });

        it('accepts a key whose type is allowed', () => {
            apiKeyUtil.validateType.mockReturnValue(true);

            expect(
                service.validateXApiKeyTypeGuard(apiKey, [
                    EnumApiKeyType.default,
                ])
            ).toBe(true);
        });
    });
});
