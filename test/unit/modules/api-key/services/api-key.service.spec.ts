import type { ICacheInvalidateEffect } from '@common/cache/interfaces/cache.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { MockInstance } from 'vitest';
import { CacheQueue } from '@common/cache/queues/cache.queue';
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
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import {
    buildApiKey,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { ApiKeyCacheSchema } from '@modules/api-key/dtos/api-key.cache.dto';

describe('ApiKeyService', () => {
    const apiKeyCache: MockProxy<ApiKeyCache> = mock<ApiKeyCache>({
        cacheTtlInMs: 4000,
    });
    const apiKeyRepository: MockProxy<ApiKeyRepository> =
        mock<ApiKeyRepository>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const cacheQueue: MockProxy<CacheQueue> = mock<CacheQueue>();
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
        cacheQueue.invalidateEffect.mockReturnValue(cacheEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyService,
                ApiKeyCredentialUtil,
                ...TestUnitKitProviders,
                { provide: ApiKeyCache, useValue: apiKeyCache },
                { provide: ApiKeyRepository, useValue: apiKeyRepository },
                { provide: CacheService, useValue: cacheService },
                { provide: CacheQueue, useValue: cacheQueue },
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

    describe('getOneById', () => {
        it('returns the row read on the client', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);

            const result = await service.getOneById(apiKey.id);

            expect(result).toBe(apiKey);
            expect(apiKeyRepository.findOneById).toHaveBeenCalledWith(
                apiKey.id
            );
        });

        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(service.getOneById('missing')).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
            });
        });
    });

    describe('assertActive', () => {
        it('returns when the api key is active', () => {
            expect(() => service.assertActive(apiKey)).not.toThrow();
        });

        it('throws ApiKeyInactiveException when the api key is inactive', () => {
            expect(() =>
                service.assertActive({ ...apiKey, isActive: false })
            ).toThrow(
                expect.objectContaining({
                    module: 'apiKey',
                    statusCode: EnumApiKeyStatusCodeError.inactive,
                })
            );
        });
    });

    describe('assertNotExpired', () => {
        it('returns when the api key has no end date', () => {
            expect(() => service.assertNotExpired(apiKey)).not.toThrow();
        });

        it('returns when the end date is ahead', () => {
            expect(() =>
                service.assertNotExpired({
                    ...apiKey,
                    endAt: new Date('2026-02-01T00:00:00.000Z'),
                })
            ).not.toThrow();
        });

        it('throws ApiKeyExpiredException when the end date has passed', () => {
            expect(() =>
                service.assertNotExpired({
                    ...apiKey,
                    startAt: new Date('2026-01-01T00:00:00.000Z'),
                    endAt: new Date('2026-01-10T00:00:00.000Z'),
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'apiKey',
                    statusCode: EnumApiKeyStatusCodeError.expired,
                })
            );
        });
    });

    describe('assertStartAtFuture', () => {
        it('returns when the start date is null', () => {
            expect(() => service.assertStartAtFuture(null)).not.toThrow();
        });

        it('returns when the start date is ahead', () => {
            expect(() =>
                service.assertStartAtFuture(
                    new Date('2026-02-01T00:00:00.000Z')
                )
            ).not.toThrow();
        });

        it('throws ApiKeyStartAtNotFutureException when the start date is before now', () => {
            expect(() =>
                service.assertStartAtFuture(
                    new Date('2025-01-01T00:00:00.000Z')
                )
            ).toThrow(
                expect.objectContaining({
                    module: 'apiKey',
                    statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
                })
            );
        });

        it('throws ApiKeyStartAtNotFutureException when the start date is exactly now', () => {
            expect(() => service.assertStartAtFuture(now)).toThrow(
                expect.objectContaining({
                    module: 'apiKey',
                    statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
                })
            );
        });
    });

    describe('assertEndAtFuture', () => {
        const startAt = new Date('2026-01-01T00:00:00.000Z');

        it('returns when the start date is null', () => {
            expect(() =>
                service.assertEndAtFuture(
                    null,
                    new Date('2025-01-01T00:00:00.000Z')
                )
            ).not.toThrow();
        });

        it('returns when the end date is null', () => {
            expect(() =>
                service.assertEndAtFuture(startAt, null)
            ).not.toThrow();
        });

        it('returns when the end date is ahead', () => {
            expect(() =>
                service.assertEndAtFuture(
                    startAt,
                    new Date('2026-03-01T00:00:00.000Z')
                )
            ).not.toThrow();
        });

        it('returns for an end date earlier today whose end of day is still ahead', () => {
            expect(() =>
                service.assertEndAtFuture(
                    startAt,
                    new Date('2026-01-15T00:00:00.000Z')
                )
            ).not.toThrow();
        });

        it('throws ApiKeyEndAtNotFutureException when the end of day of the end date has passed', () => {
            expect(() =>
                service.assertEndAtFuture(
                    startAt,
                    new Date('2026-01-14T10:00:00.000Z')
                )
            ).toThrow(
                expect.objectContaining({
                    module: 'apiKey',
                    statusCode: EnumApiKeyStatusCodeError.endAtNotFuture,
                })
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

        it('rounds the date window to the start and end of day when both dates are given', async () => {
            const startAt = new Date('2026-02-01T10:00:00.000Z');
            const endAt = new Date('2026-03-01T10:00:00.000Z');
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

        it('lets the repository rejection through', async () => {
            const failure = new Error('collision');
            apiKeyRepository.createInTx.mockRejectedValue(failure);

            await expect(
                service.createByAdminInTx(tx, 'api-key-1', create)
            ).rejects.toBe(failure);
        });
    });

    describe('updateStatusByAdminInTx', () => {
        it('updates the status and adds the cache invalidation effect on the tx', async () => {
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyRepository.updateStatusInTx.mockResolvedValue(updated);

            const result = await service.updateStatusByAdminInTx(
                tx,
                apiKey,
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
            expect(cacheQueue.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('lets the repository rejection through and adds no effect', async () => {
            const failure = new ApiKeyNotFoundException();
            apiKeyRepository.updateStatusInTx.mockRejectedValue(failure);

            await expect(
                service.updateStatusByAdminInTx(tx, apiKey, false)
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdminInTx', () => {
        it('renames the api key and adds the cache invalidation effect on the tx', async () => {
            const renamed: ApiKey = { ...apiKey, name: 'New Name' };
            apiKeyRepository.updateNameInTx.mockResolvedValue(renamed);

            const result = await service.updateByAdminInTx(
                tx,
                apiKey,
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
            expect(cacheQueue.invalidateEffect).toHaveBeenCalledWith(keys);
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
            const updated: ApiKey = {
                ...apiKey,
                startAt: yesterdayDay,
                endAt: nextYearDay,
            };
            apiKeyRepository.updateDatesInTx.mockResolvedValue(updated);

            const result = await service.updateDatesByAdminInTx(
                tx,
                apiKey,
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

        it('writes both dates null when both inputs are null', async () => {
            const updated: ApiKey = { ...apiKey, startAt: null, endAt: null };
            apiKeyRepository.updateDatesInTx.mockResolvedValue(updated);

            const result = await service.updateDatesByAdminInTx(
                tx,
                apiKey,
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
            apiKeyRepository.updateDatesInTx.mockResolvedValue(apiKey);

            await service.updateDatesByAdminInTx(tx, apiKey, startAt, null);

            expect(apiKeyRepository.updateDatesInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                null,
                null
            );
        });

        it('adds the cache invalidation effect on the tx after the write', async () => {
            const updated: ApiKey = {
                ...apiKey,
                startAt: startAtDay,
                endAt: endAtDay,
            };
            apiKeyRepository.updateDatesInTx.mockResolvedValue(updated);

            const result = await service.updateDatesByAdminInTx(
                tx,
                apiKey,
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
            expect(cacheQueue.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('lets the repository rejection through and adds no effect', async () => {
            const failure = new ApiKeyInactiveException();
            apiKeyRepository.updateDatesInTx.mockRejectedValue(failure);

            await expect(
                service.updateDatesByAdminInTx(tx, apiKey, startAt, endAt)
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('resetByAdminInTx', () => {
        it('creates a new secret, updates the hash, and adds the cache invalidation effect on the tx', async () => {
            stubRandom(random, 'unused', 'new-secret');
            const newHash =
                '182f48be1503436e9fc2845af64b59df8c972076e47d5b1e78232e664dead6bc';
            const updated: ApiKey = { ...apiKey, hash: newHash };
            apiKeyRepository.updateHashInTx.mockResolvedValue(updated);

            const result = await service.resetByAdminInTx(tx, apiKey);

            expect(result).toEqual({ apiKey: updated, secret: 'new-secret' });
            expect(apiKeyRepository.updateHashInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                newHash
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheQueue.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('lets the repository rejection through and adds no effect', async () => {
            stubRandom(random, 'unused', 'new-secret');
            const failure = new ApiKeyInactiveException();
            apiKeyRepository.updateHashInTx.mockRejectedValue(failure);

            await expect(service.resetByAdminInTx(tx, apiKey)).rejects.toBe(
                failure
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('deleteByAdminInTx', () => {
        const authContext = buildAuthJwtAccessContext('user-actor');

        it('soft deletes the api key with the clock time and the actor, adds the cache invalidation effect from the deleted row key on the tx, and returns the deleted row', async () => {
            apiKeyRepository.softDeleteInTx.mockResolvedValue(apiKey);

            const result = await service.deleteByAdminInTx(
                tx,
                authContext,
                apiKey.id
            );

            expect(result).toBe(apiKey);
            expect(apiKeyRepository.softDeleteInTx).toHaveBeenCalledWith(
                tx,
                apiKey.id,
                now,
                authContext.userId
            );
            expect(apiKeyCache.buildApiKeyKeys).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(cacheQueue.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it('lets the repository rejection through and adds no effect', async () => {
            const failure = new ApiKeyNotFoundException();
            apiKeyRepository.softDeleteInTx.mockRejectedValue(failure);

            await expect(
                service.deleteByAdminInTx(tx, authContext, apiKey.id)
            ).rejects.toBe(failure);
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
