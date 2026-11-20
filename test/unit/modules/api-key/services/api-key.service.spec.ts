import type { ICacheInvalidateEffect } from '@common/cache/interfaces/cache.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { MockInstance } from 'vitest';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { stubApiKeyRandom as stubRandom } from '@test/unit/helpers/test.unit.api-key.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyCacheSchema } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { buildApiKey } from '@test/unit/helpers/test.unit.request.helper';

describe('ApiKeyService', () => {
    const apiKeyCache: MockProxy<ApiKeyCache> = mock<ApiKeyCache>({
        cacheTtlInMs: 4000,
    });
    const apiKeyRepository: MockProxy<ApiKeyRepository> =
        mock<ApiKeyRepository>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-15T00:00:00.000Z');
    const apiKey: ApiKey = {
        ...buildApiKey(),
        key: 'local_abc123',
    };

    const keys = ['ApiKey:local_abc123', 'ApiKey:Lease:local_abc123'];
    const cacheEffect: ICacheInvalidateEffect = {
        queue: EnumCacheQueue.cache,
        name: EnumCacheProcess.invalidate,
        data: { keys },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };

    let service: ApiKeyService;
    let random: MockInstance<HelperStringService['random']>;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        apiKeyCache.buildApiKeyKeys.mockReturnValue(keys);
        cacheService.invalidateEffect.mockReturnValue(cacheEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyService,
                ApiKeyCredentialUtil,
                ...TestUnitKitProviders,
                { provide: ApiKeyCache, useValue: apiKeyCache },
                { provide: ApiKeyRepository, useValue: apiKeyRepository },
                { provide: CacheService, useValue: cacheService },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'app.env': 'local',
                        'auth.xApiKey.keyLength': 30,
                        'auth.xApiKey.secretLength': 40,
                    }),
                },
            ],
        }).compile();

        random = vi.spyOn(module.get(HelperStringService), 'random');
        stubRandom(random, 'abc123', 'plain-secret');

        service = module.get(ApiKeyService);
    });

    describe('getListByAdmin', () => {
        it('delegates the offset pagination read to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
            const page: IPaginationOffsetReturn<IApiKey> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            apiKeyRepository.findWithPagination.mockResolvedValue(page);

            const result = await service.getListByAdmin(pagination);

            expect(result).toBe(page);
            expect(apiKeyRepository.findWithPagination).toHaveBeenCalledWith(
                pagination,
                null,
                null
            );
        });

        it('forwards the active and type filters to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<IApiKey> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            const isActive = { isActive: { equals: true } };
            const type = { type: { in: [EnumApiKeyType.default] } };
            apiKeyRepository.findWithPagination.mockResolvedValue(page);

            const result = await service.getListByAdmin(
                pagination,
                isActive,
                type
            );

            expect(result).toBe(page);
            expect(apiKeyRepository.findWithPagination).toHaveBeenCalledWith(
                pagination,
                isActive,
                type
            );
        });
    });

    describe('createByAdminInTx', () => {
        const create: IApiKeyCreate = {
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            startAt: null,
            endAt: null,
        };

        beforeEach(() => {
            apiKeyRepository.createInTx.mockResolvedValue(apiKey);
        });

        it('creates the api key under the given id with no date window', async () => {
            const result = await service.createByAdminInTx(
                tx,
                'api-key-1',
                create
            );

            expect(result).toEqual({ apiKey, secret: 'plain-secret' });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(apiKeyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'api-key-1',
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: null,
                    endAt: null,
                },
                'local_abc123',
                '689b933d54650fa01b8ec964bc5dd70ec6a8442ca7bb424248f24fe97c5ce006'
            );
        });

        it('validates a future startAt and normalizes the date window when both dates are given', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const startAtDay = new Date('2026-02-01T00:00:00.000Z');
            const endAtDay = new Date('2026-03-01T23:59:59.999Z');

            await service.createByAdminInTx(tx, 'api-key-1', {
                ...create,
                startAt,
                endAt,
            });

            expect(apiKeyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'api-key-1',
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: startAtDay,
                    endAt: endAtDay,
                },
                'local_abc123',
                '689b933d54650fa01b8ec964bc5dd70ec6a8442ca7bb424248f24fe97c5ce006'
            );
        });

        it('throws ApiKeyStartAtNotFutureException when startAt is not in the future', async () => {
            const startAt = new Date('2025-01-01T00:00:00.000Z');

            await expect(
                service.createByAdminInTx(tx, 'api-key-1', {
                    ...create,
                    startAt,
                })
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
            });
        });
    });

    describe('updateStatusByAdminInTx', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.updateStatusByAdminInTx(tx, 'missing', true)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });

        it('throws ApiKeyExpiredException when the api key window already expired', async () => {
            const expiredApiKey: ApiKey = {
                ...apiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-01-10T00:00:00.000Z'),
            };
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(expiredApiKey);

            await expect(
                service.updateStatusByAdminInTx(tx, apiKey.id, true)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.expired,
            });
        });

        it('updates the status and adds the cache invalidation effect on the tx', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyRepository.updateStatusInTx.mockResolvedValue(updated);

            const result = await service.updateStatusByAdminInTx(
                tx,
                apiKey.id,
                false
            );

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateStatusInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                apiKey.isActive,
                false
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('throws ApiKeyNotFoundException when the guarded write misses', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            apiKeyRepository.updateStatusInTx.mockResolvedValue(null);

            await expect(
                service.updateStatusByAdminInTx(tx, apiKey.id, false)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdminInTx', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.updateByAdminInTx(tx, 'missing', 'New Name')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });

        it('throws ApiKeyInactiveException when the api key is inactive', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });

            await expect(
                service.updateByAdminInTx(tx, apiKey.id, 'New Name')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
            });
        });

        it('renames the api key and adds the cache invalidation effect on the tx', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            const renamed: ApiKey = { ...apiKey, name: 'New Name' };
            apiKeyRepository.updateNameInTx.mockResolvedValue(renamed);

            const result = await service.updateByAdminInTx(
                tx,
                apiKey.id,
                'New Name'
            );

            expect(result).toBe(renamed);
            expect(apiKeyRepository.updateNameInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                'New Name'
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });
    });

    describe('updateDatesByAdminInTx', () => {
        const startAt = new Date('2026-02-01T00:00:00.000Z');
        const endAt = new Date('2026-03-01T00:00:00.000Z');
        const startAtDay = new Date('2026-02-01T00:00:00.000Z');
        const endAtDay = new Date('2026-03-01T23:59:59.999Z');

        it('writes both rounded dates for a past startAt and a future endAt', async () => {
            const yesterday = new Date('2026-01-14T10:00:00.000Z');
            const nextYear = new Date('2027-01-15T10:00:00.000Z');
            const yesterdayDay = new Date('2026-01-14T00:00:00.000Z');
            const nextYearDay = new Date('2027-01-15T23:59:59.999Z');
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            const updated: ApiKey = {
                ...apiKey,
                startAt: yesterdayDay,
                endAt: nextYearDay,
            };
            apiKeyRepository.updateDatesInTx.mockResolvedValue(updated);

            const result = await service.updateDatesByAdminInTx(
                tx,
                apiKey.id,
                yesterday,
                nextYear
            );

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateDatesInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                yesterdayDay,
                nextYearDay
            );
        });

        it('throws ApiKeyEndAtNotFutureException when the rounded endAt is not after now', async () => {
            await expect(
                service.updateDatesByAdminInTx(
                    tx,
                    apiKey.id,
                    startAt,
                    new Date('2025-01-01T00:00:00.000Z')
                )
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.endAtNotFuture,
            });
            expect(apiKeyRepository.updateDatesInTx).not.toHaveBeenCalled();
        });

        it('writes both dates null when both inputs are null', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            const updated: ApiKey = { ...apiKey, startAt: null, endAt: null };
            apiKeyRepository.updateDatesInTx.mockResolvedValue(updated);

            const result = await service.updateDatesByAdminInTx(
                tx,
                apiKey.id,
                null,
                null
            );

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateDatesInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                null,
                null
            );
        });

        it('writes both dates null when exactly one input is null', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            apiKeyRepository.updateDatesInTx.mockResolvedValue(apiKey);

            await service.updateDatesByAdminInTx(tx, apiKey.id, startAt, null);

            expect(apiKeyRepository.updateDatesInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                null,
                null
            );
        });

        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.updateDatesByAdminInTx(tx, 'missing', startAt, endAt)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });

        it('throws ApiKeyInactiveException when the api key is inactive', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });

            await expect(
                service.updateDatesByAdminInTx(tx, apiKey.id, startAt, endAt)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
            });
        });

        it('normalizes and updates the date window and adds the cache invalidation effect on the tx', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            const updated: ApiKey = {
                ...apiKey,
                startAt: startAtDay,
                endAt: endAtDay,
            };
            apiKeyRepository.updateDatesInTx.mockResolvedValue(updated);

            const result = await service.updateDatesByAdminInTx(
                tx,
                apiKey.id,
                startAt,
                endAt
            );

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateDatesInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                startAtDay,
                endAtDay
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('throws ApiKeyInactiveException when the guarded write misses', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            apiKeyRepository.updateDatesInTx.mockResolvedValue(null);

            await expect(
                service.updateDatesByAdminInTx(tx, apiKey.id, startAt, endAt)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('resetByAdminInTx', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.resetByAdminInTx(tx, 'missing')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });

        it('throws ApiKeyInactiveException when the api key is inactive', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });

            await expect(
                service.resetByAdminInTx(tx, apiKey.id)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
            });
        });

        it('creates a new secret, updates the hash, and adds the cache invalidation effect on the tx', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            stubRandom(random, 'unused', 'new-secret');
            const newHash =
                '182f48be1503436e9fc2845af64b59df8c972076e47d5b1e78232e664dead6bc';
            const updated: ApiKey = { ...apiKey, hash: newHash };
            apiKeyRepository.updateHashInTx.mockResolvedValue(updated);

            const result = await service.resetByAdminInTx(tx, apiKey.id);

            expect(result).toEqual({ apiKey: updated, secret: 'new-secret' });
            expect(apiKeyRepository.updateHashInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                newHash
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('throws ApiKeyInactiveException when the guarded write misses', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            stubRandom(random, 'unused', 'new-secret');
            apiKeyRepository.updateHashInTx.mockResolvedValue(null);

            await expect(
                service.resetByAdminInTx(tx, apiKey.id)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('deleteByAdminInTx', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.deleteByAdminInTx(tx, 'missing')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });

        it('deletes the api key, adds the cache invalidation effect on the tx, and returns the row it read', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            apiKeyRepository.deleteInTx.mockResolvedValue(true);

            const result = await service.deleteByAdminInTx(tx, apiKey.id);

            expect(result).toBe(apiKey);
            expect(apiKeyRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('throws ApiKeyNotFoundException when the guarded write misses', async () => {
            apiKeyRepository.findOneByIdInTx.mockResolvedValue(apiKey);
            apiKeyRepository.deleteInTx.mockResolvedValue(false);

            await expect(
                service.deleteByAdminInTx(tx, apiKey.id)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('validateXApiKey', () => {
        const matchingApiKey: ApiKey = {
            ...apiKey,
            hash: 'f4683e97d795a38456393f54c7cc9706a62dc3769b8b00c06385ef573413d3f3',
        };

        const lease = { key: 'ApiKey:Lease:local_abc123', ttlInMs: 10000 };

        beforeEach(() => {
            apiKeyCache.buildApiKeyKey.mockReturnValue('ApiKey:local_abc123');
            apiKeyCache.buildApiKeyLease.mockReturnValue(lease);
        });

        it('throws ApiKeyXApiKeyRequiredException when the header is null', async () => {
            await expect(service.validateXApiKey(null)).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
            });
        });

        it('throws ApiKeyXApiKeyRequiredException when the header is blank', async () => {
            await expect(service.validateXApiKey('   ')).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the header does not parse', async () => {
            await expect(
                service.validateXApiKey('  local_abc123  ')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });

        it('reads through with the entry key, ApiKeyCacheSchema, the TTL, and the lease', async () => {
            cacheService.readThrough.mockResolvedValue(matchingApiKey);

            await service.validateXApiKey('local_abc123:secret-1');

            expect(apiKeyCache.buildApiKeyKey).toHaveBeenCalledWith(
                'local_abc123'
            );
            expect(apiKeyCache.buildApiKeyLease).toHaveBeenCalledWith(
                'local_abc123'
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'ApiKey:local_abc123',
                ApiKeyCacheSchema,
                4000,
                expect.any(Function),
                { lease }
            );
        });

        it('passes a loader that reads the repository by key', async () => {
            cacheService.readThrough.mockImplementation(
                async (_key, _schema, _ttlInMs, loader) => loader()
            );
            apiKeyRepository.findOneByKey.mockResolvedValue(matchingApiKey);

            const result = await service.validateXApiKey(
                'local_abc123:secret-1'
            );

            expect(result).toBe(matchingApiKey);
            expect(apiKeyRepository.findOneByKey).toHaveBeenCalledWith(
                'local_abc123'
            );
        });

        it('throws ApiKeyXApiKeyInvalidException when no api key matches the key half', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            await expect(
                service.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the credential does not match', async () => {
            cacheService.readThrough.mockResolvedValue(apiKey);

            await expect(
                service.validateXApiKey('local_abc123:wrong-secret')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the key is inactive', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...matchingApiKey,
                isActive: false,
            });

            await expect(
                service.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                module: 'apiKey',

                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the key is not yet active', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...matchingApiKey,
                startAt: new Date('2026-02-01T00:00:00.000Z'),
            });

            await expect(
                service.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                module: 'apiKey',

                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
        });

        it('throws ApiKeyExpiredException when the endAt is past', async () => {
            const expiredApiKey: ApiKey = {
                ...matchingApiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-01-10T00:00:00.000Z'),
            };
            cacheService.readThrough.mockResolvedValue(expiredApiKey);

            await expect(
                service.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.expired,
            });
        });

        it('returns the api key read through when the credential matches', async () => {
            cacheService.readThrough.mockResolvedValue(matchingApiKey);

            const result = await service.validateXApiKey(
                'local_abc123:secret-1'
            );

            expect(result).toBe(matchingApiKey);
        });
    });

    describe('validateXApiKeyTypeGuard', () => {
        it('throws ApiKeyXApiKeyForbiddenException when the api key type is not allowed', () => {
            let thrown: unknown;
            try {
                service.validateXApiKeyTypeGuard(apiKey, [
                    EnumApiKeyType.system,
                ]);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
            });
        });

        it('returns true when the api key type is allowed', () => {
            const result = service.validateXApiKeyTypeGuard(apiKey, [
                EnumApiKeyType.default,
            ]);

            expect(result).toBe(true);
        });
    });

    describe('getValidApiKey', () => {
        it('throws ApiKeyNotFoundException when the api key is null', () => {
            let thrown: unknown;
            try {
                service['getValidApiKey'](null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });

        it('throws ApiKeyInactiveException when includeActive is true and the api key is inactive', () => {
            let thrown: unknown;
            try {
                service['getValidApiKey']({ ...apiKey, isActive: false }, true);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
            });
        });

        it('returns the api key when includeActive is false, whatever the active flag', () => {
            const inactiveApiKey: ApiKey = { ...apiKey, isActive: false };

            expect(service['getValidApiKey'](inactiveApiKey, false)).toBe(
                inactiveApiKey
            );
        });

        it('returns the api key when includeActive is true and the api key is active', () => {
            expect(service['getValidApiKey'](apiKey, true)).toBe(apiKey);
        });
    });

    describe('validateStartAtIsFuture', () => {
        it('throws ApiKeyStartAtNotFutureException when startAt is at or before now', () => {
            let thrown: unknown;
            try {
                service['validateStartAtIsFuture'](now);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
            });
        });

        it('returns with no throw when startAt is after now', () => {
            const future = new Date('2026-02-01T00:00:00.000Z');

            expect(() =>
                service['validateStartAtIsFuture'](future)
            ).not.toThrow();
        });
    });

    describe('isActive', () => {
        it('returns the active flag of the api key', () => {
            expect(service['isActive']({ ...apiKey, isActive: true })).toBe(
                true
            );
            expect(service['isActive']({ ...apiKey, isActive: false })).toBe(
                false
            );
        });
    });

    describe('isExpired', () => {
        const currentDate = new Date('2026-01-15T00:00:00.000Z');

        it('returns true when the current date is after endAt', () => {
            const result = service['isExpired'](
                new Date('2020-01-01T00:00:00.000Z'),
                currentDate
            );

            expect(result).toBe(true);
        });

        it('returns false when the current date is before endAt', () => {
            const result = service['isExpired'](
                new Date('2026-02-01T00:00:00.000Z'),
                currentDate
            );

            expect(result).toBe(false);
        });

        it('returns false when endAt is absent', () => {
            expect(service['isExpired'](null, currentDate)).toBe(false);
        });
    });

    describe('isNotYetActive', () => {
        const currentDate = new Date('2026-01-05T00:00:00.000Z');

        it('returns true when the current date is before startAt', () => {
            const result = service['isNotYetActive'](
                new Date('2026-01-10T00:00:00.000Z'),
                currentDate
            );

            expect(result).toBe(true);
        });

        it('returns false when the current date is at or after startAt', () => {
            const result = service['isNotYetActive'](
                new Date('2026-01-01T00:00:00.000Z'),
                currentDate
            );

            expect(result).toBe(false);
        });

        it('returns false when startAt is absent', () => {
            expect(service['isNotYetActive'](null, currentDate)).toBe(false);
        });
    });

    describe('validateType', () => {
        it('returns true when the api key type is in the allow-list', () => {
            const result = service['validateType'](
                { type: EnumApiKeyType.default },
                [EnumApiKeyType.default, EnumApiKeyType.system]
            );

            expect(result).toBe(true);
        });

        it('returns false when the api key type is not in the allow-list', () => {
            const result = service['validateType'](
                { type: EnumApiKeyType.system },
                [EnumApiKeyType.default]
            );

            expect(result).toBe(false);
        });
    });

    describe('createSecret', () => {
        it('returns a random secret of the configured secret length', () => {
            stubRandom(random, 'unused', 'random-secret');

            const result = service['createSecret']();

            expect(result).toBe('random-secret');
            expect(random).toHaveBeenCalledWith(40);
        });
    });

    describe('generateCredential', () => {
        it('generates a key, secret, and hash', () => {
            stubRandom(random, 'random-key', 'random-secret');

            const result = service['generateCredential']();

            expect(result).toEqual({
                key: 'local_random-key',
                secret: 'random-secret',
                hash: '36e24f36c2d8c82034c6bec9b57ee303f16ccfbb4e4d841a718ee422643c81fa',
            });
        });
    });

    describe('parseHeader', () => {
        it('returns the key and secret of a key:secret header', () => {
            expect(service['parseHeader']('local_abc123:secret-1')).toEqual({
                key: 'local_abc123',
                secret: 'secret-1',
            });
        });

        it.each([
            ['no separator', 'local_abc123'],
            ['two separators', 'local_abc123:secret:extra'],
            ['a blank key', ' :secret'],
            ['a blank secret', 'local_abc123: '],
            ['an empty secret', 'local_abc123:'],
        ])('returns null for a header with %s', (_label, header) => {
            expect(service['parseHeader'](header)).toBeNull();
        });
    });

    describe('validateCredential', () => {
        it('returns true when the re-derived hash matches the stored hash', () => {
            const result = service['validateCredential']('key-1', 'secret-1', {
                hash: 'b18a276615212509238d7857f88d060a8299b2e998c2bcb88d6b284143cccc6c',
            });

            expect(result).toBe(true);
        });

        it('returns false when the re-derived hash does not match the stored hash', () => {
            const result = service['validateCredential']('key-1', 'secret-1', {
                hash: 'other-hash',
            });

            expect(result).toBe(false);
        });
    });
});
