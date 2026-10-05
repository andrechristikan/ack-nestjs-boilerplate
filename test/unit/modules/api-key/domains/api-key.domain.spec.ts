import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
} from '@generated/prisma-client/client';
import type { ApiKey, Prisma } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import type {
    IApiKey,
    IApiKeyCreate,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

describe('ApiKeyDomain', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const apiKeyCredentialUtil: MockProxy<ApiKeyCredentialUtil> =
        mock<ApiKeyCredentialUtil>();
    const apiKeyCache: MockProxy<ApiKeyCache> = mock<ApiKeyCache>();
    const apiKeyRepository: MockProxy<ApiKeyRepository> =
        mock<ApiKeyRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const now = new Date('2026-01-15T00:00:00.000Z');
    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const stagedEvent: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.adminApiKeyCreate,
        metadata: { apiKeyId: apiKey.id },
        onError: false,
    };

    let domain: ApiKeyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        activityLogDomain.prepare.mockReturnValue(stagedEvent);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyDomain,
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                {
                    provide: ApiKeyCredentialUtil,
                    useValue: apiKeyCredentialUtil,
                },
                { provide: ApiKeyCache, useValue: apiKeyCache },
                { provide: ApiKeyRepository, useValue: apiKeyRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        domain = module.get(ApiKeyDomain);
    });

    describe('getListByAdmin', () => {
        it('delegates the offset pagination read to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput> =
                {
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

            const result = await domain.getListByAdmin(pagination);

            expect(result).toBe(page);
            expect(apiKeyRepository.findWithPagination).toHaveBeenCalledWith(
                pagination,
                undefined,
                undefined
            );
        });
    });

    describe('createByAdmin', () => {
        const create: IApiKeyCreate = {
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
        };

        beforeEach(() => {
            apiKeyCredentialUtil.generateCredential.mockReturnValue({
                key: 'local_abc123',
                secret: 'plain-secret',
                hash: 'hashed-secret',
            });
            databaseUtil.createId.mockReturnValue('api-key-1');
            apiKeyRepository.create.mockResolvedValue(apiKey);
        });

        it('creates the api key with no date window and stages the create event', async () => {
            const result = await domain.createByAdmin(create);

            expect(result).toEqual({ apiKey, secret: 'plain-secret' });
            expect(apiKeyRepository.create).toHaveBeenCalledWith(
                'api-key-1',
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: undefined,
                    endAt: undefined,
                },
                'local_abc123',
                'hashed-secret'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });

        it('validates a future startAt and normalizes the date window when both dates are given', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const startAtDay = new Date('2026-02-01T00:00:00.000Z');
            const endAtDay = new Date('2026-03-01T23:59:59.999Z');
            helperDateService.create.mockImplementation((date, options) => {
                if (!date) {
                    return now;
                }
                if (options?.dayOf === EnumHelperDateDayOf.start) {
                    return startAtDay;
                }
                if (options?.dayOf === EnumHelperDateDayOf.end) {
                    return endAtDay;
                }
                return date;
            });

            await domain.createByAdmin({ ...create, startAt, endAt });

            expect(apiKeyRepository.create).toHaveBeenCalledWith(
                'api-key-1',
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: startAtDay,
                    endAt: endAtDay,
                },
                'local_abc123',
                'hashed-secret'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
        });

        it('throws ApiKeyStartAtNotFutureException when startAt is not in the future', async () => {
            const startAt = new Date('2025-01-01T00:00:00.000Z');

            await expect(
                domain.createByAdmin({ ...create, startAt })
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.startAtNotFuture
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.startAtNotFuture',
            });
        });
    });

    describe('updateStatusByAdmin', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateStatusByAdmin('missing', true)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'apiKey.error.notFound',
            });
        });

        it('throws ApiKeyExpiredException when the api key window already expired', async () => {
            const expiredApiKey: ApiKey = {
                ...apiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-01-10T00:00:00.000Z'),
            };
            apiKeyRepository.findOneById.mockResolvedValue(expiredApiKey);
            apiKeyUtil.isExpired.mockReturnValue(true);

            await expect(
                domain.updateStatusByAdmin(apiKey.id, true)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.expired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.expired
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.expired',
            });
        });

        it('updates the status, stages the event, and purges the cache', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(false);
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyRepository.updateStatus.mockResolvedValue(updated);

            const result = await domain.updateStatusByAdmin(apiKey.id, false);

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateStatus).toHaveBeenCalledWith(
                apiKey.id,
                { isActive: false }
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
        });
    });

    describe('updateByAdmin', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateByAdmin('missing', 'New Name')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'apiKey.error.notFound',
            });
        });

        it('throws ApiKeyInactiveException when the api key is inactive', async () => {
            apiKeyRepository.findOneById.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });
            apiKeyUtil.isActive.mockReturnValue(false);

            await expect(
                domain.updateByAdmin(apiKey.id, 'New Name')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.inactive
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.inactive',
            });
        });

        it('renames the api key, stages the event in order, and purges the cache when a name is given', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            const metadata = { apiKeyId: apiKey.id };
            apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            const renamed: ApiKey = { ...apiKey, name: 'New Name' };
            const callOrder: string[] = [];
            apiKeyRepository.updateName.mockImplementation(async () => {
                callOrder.push('updateName');
                return renamed;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            apiKeyCache.deleteCacheByKey.mockImplementation(async () => {
                callOrder.push('deleteCacheByKey');
            });

            const result = await domain.updateByAdmin(apiKey.id, 'New Name');

            expect(result).toBe(renamed);
            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                { id: apiKey.id, type: apiKey.type, name: 'New Name' },
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdate,
                metadata,
                onError: true,
            });
            expect(apiKeyRepository.updateName).toHaveBeenCalledWith(
                apiKey.id,
                'New Name'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(callOrder).toEqual([
                'updateName',
                'stagePrepared',
                'deleteCacheByKey',
            ]);
        });
    });

    describe('updateDatesByAdmin', () => {
        const startAt = new Date('2026-02-01T00:00:00.000Z');
        const endAt = new Date('2026-03-01T00:00:00.000Z');

        it('throws ApiKeyStartAtNotFutureException when startAt is not in the future', async () => {
            const pastStartAt = new Date('2025-01-01T00:00:00.000Z');

            await expect(
                domain.updateDatesByAdmin(apiKey.id, pastStartAt, endAt)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.startAtNotFuture
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.startAtNotFuture',
            });
        });

        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateDatesByAdmin('missing', startAt, endAt)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'apiKey.error.notFound',
            });
        });

        it('throws ApiKeyInactiveException when the api key is inactive', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(false);

            await expect(
                domain.updateDatesByAdmin(apiKey.id, startAt, endAt)
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.inactive
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.inactive',
            });
        });

        it('normalizes and updates the date window, stages the event in order, and purges the cache', async () => {
            const startAtDay = new Date('2026-02-01T00:00:00.000Z');
            const endAtDay = new Date('2026-03-01T23:59:59.999Z');
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            helperDateService.create.mockImplementation((date, options) => {
                if (!date) {
                    return now;
                }
                if (options?.dayOf === EnumHelperDateDayOf.start) {
                    return startAtDay;
                }
                if (options?.dayOf === EnumHelperDateDayOf.end) {
                    return endAtDay;
                }
                return date;
            });
            const metadata = { apiKeyId: apiKey.id };
            apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            const updated: ApiKey = {
                ...apiKey,
                startAt: startAtDay,
                endAt: endAtDay,
            };
            const callOrder: string[] = [];
            apiKeyRepository.updateDates.mockImplementation(async () => {
                callOrder.push('updateDates');
                return updated;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            apiKeyCache.deleteCacheByKey.mockImplementation(async () => {
                callOrder.push('deleteCacheByKey');
            });

            const result = await domain.updateDatesByAdmin(
                apiKey.id,
                startAt,
                endAt
            );

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateDates).toHaveBeenCalledWith(
                apiKey.id,
                { startAt: startAtDay, endAt: endAtDay }
            );
            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdateDate,
                metadata,
                onError: true,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(callOrder).toEqual([
                'updateDates',
                'stagePrepared',
                'deleteCacheByKey',
            ]);
        });
    });

    describe('resetByAdmin', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(domain.resetByAdmin('missing')).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'apiKey.error.notFound',
            });
        });

        it('throws ApiKeyInactiveException when the api key is inactive', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(false);

            await expect(domain.resetByAdmin(apiKey.id)).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.inactive
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.inactive',
            });
        });

        it('creates a new secret, updates the hash, stages the event in order, and purges the cache', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isActive.mockReturnValue(true);
            apiKeyCredentialUtil.createSecret.mockReturnValue('new-secret');
            apiKeyCredentialUtil.createHash.mockReturnValue('new-hash');
            const metadata = { apiKeyId: apiKey.id };
            apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            const updated: ApiKey = { ...apiKey, hash: 'new-hash' };
            const callOrder: string[] = [];
            apiKeyRepository.updateHash.mockImplementation(async () => {
                callOrder.push('updateHash');
                return updated;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            apiKeyCache.deleteCacheByKey.mockImplementation(async () => {
                callOrder.push('deleteCacheByKey');
            });

            const result = await domain.resetByAdmin(apiKey.id);

            expect(result).toEqual({ apiKey: updated, secret: 'new-secret' });
            expect(apiKeyCredentialUtil.createHash).toHaveBeenCalledWith(
                apiKey.key,
                'new-secret'
            );
            expect(apiKeyRepository.updateHash).toHaveBeenCalledWith(
                apiKey.id,
                'new-hash'
            );
            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyReset,
                metadata,
                onError: true,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
            expect(callOrder).toEqual([
                'updateHash',
                'stagePrepared',
                'deleteCacheByKey',
            ]);
        });
    });

    describe('deleteByAdmin', () => {
        it('throws ApiKeyNotFoundException when the api key does not exist', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(null);

            await expect(domain.deleteByAdmin('missing')).rejects.toMatchObject(
                {
                    module: 'apiKey',
                    statusCode: EnumApiKeyStatusCodeError.notFound,
                    statusCodeKey:
                        EnumApiKeyStatusCodeError[
                            EnumApiKeyStatusCodeError.notFound
                        ],
                    httpStatus: HttpStatus.NOT_FOUND,
                    messagePath: 'apiKey.error.notFound',
                }
            );
        });

        it('deletes the api key, stages the event, and purges the cache', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyRepository.delete.mockResolvedValue(apiKey);

            const result = await domain.deleteByAdmin(apiKey.id);

            expect(result).toBe(apiKey);
            expect(apiKeyRepository.delete).toHaveBeenCalledWith(apiKey.id);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedEvent,
            ]);
            expect(apiKeyCache.deleteCacheByKey).toHaveBeenCalledWith(
                apiKey.key
            );
        });
    });

    describe('getOneActiveByKeyAndCache', () => {
        it('returns the cached api key without reading the repository', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);

            const result = await domain.getOneActiveByKeyAndCache(apiKey.key);

            expect(result).toBe(apiKey);
            expect(apiKeyRepository.findOneByKey).not.toHaveBeenCalled();
        });

        it('reads the repository and caches the result on a cache miss', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(apiKey);

            const result = await domain.getOneActiveByKeyAndCache(apiKey.key);

            expect(result).toBe(apiKey);
            expect(apiKeyCache.setCacheByKey).toHaveBeenCalledWith(
                apiKey.key,
                apiKey
            );
        });

        it('returns null and writes nothing to the cache when the key is unknown', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(null);

            const result = await domain.getOneActiveByKeyAndCache('unknown');

            expect(result).toBeNull();
            expect(apiKeyCache.setCacheByKey).not.toHaveBeenCalled();
        });
    });

    describe('validateXApiKey', () => {
        it('throws ApiKeyXApiKeyRequiredException when the header is null', async () => {
            await expect(domain.validateXApiKey(null)).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.required',
            });
        });

        it('throws ApiKeyXApiKeyRequiredException when the header is blank', async () => {
            await expect(domain.validateXApiKey('   ')).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.required',
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the header has no colon separator', async () => {
            await expect(
                domain.validateXApiKey('local_abc123')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the header has more than one colon separator', async () => {
            await expect(
                domain.validateXApiKey('local_abc123:secret:extra')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the key half is blank', async () => {
            await expect(
                domain.validateXApiKey(' :secret')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the secret half is blank', async () => {
            await expect(
                domain.validateXApiKey('local_abc123: ')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });

        it('throws ApiKeyXApiKeyNotFoundException when no api key matches the key half', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(null);

            await expect(
                domain.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyNotFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyNotFound
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'apiKey.error.xApiKey.notFound',
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the credential does not match', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(false);
            apiKeyUtil.isValid.mockReturnValue(true);

            await expect(
                domain.validateXApiKey('local_abc123:wrong-secret')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the key is no longer valid', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isValid.mockReturnValue(false);

            await expect(
                domain.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });

        it('returns the resolved api key when the credential and validity both pass', async () => {
            apiKeyCache.getCacheByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isValid.mockReturnValue(true);

            const result = await domain.validateXApiKey(
                'local_abc123:secret-1'
            );

            expect(result).toBe(apiKey);
            expect(
                apiKeyCredentialUtil.validateCredential
            ).toHaveBeenCalledWith('local_abc123', 'secret-1', apiKey);
        });
    });

    describe('validateXApiKeyTypeGuard', () => {
        it('throws ApiKeyXApiKeyPredefinedNotFoundException when no api key type is required', () => {
            let thrown: unknown;
            try {
                domain.validateXApiKeyTypeGuard(apiKey, []);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyPredefinedNotFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyPredefinedNotFound
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'apiKey.error.xApiKey.predefinedNotFound',
            });
        });

        it('throws ApiKeyXApiKeyForbiddenException when no api key is resolved', () => {
            let thrown: unknown;
            try {
                domain.validateXApiKeyTypeGuard(null, [EnumApiKeyType.default]);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'apiKey.error.xApiKey.forbidden',
            });
        });

        it('throws ApiKeyXApiKeyForbiddenException when the api key type is not allowed', () => {
            apiKeyUtil.validateType.mockReturnValue(false);

            let thrown: unknown;
            try {
                domain.validateXApiKeyTypeGuard(apiKey, [
                    EnumApiKeyType.system,
                ]);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'apiKey.error.xApiKey.forbidden',
            });
        });

        it('returns true when the api key type is allowed', () => {
            apiKeyUtil.validateType.mockReturnValue(true);

            const result = domain.validateXApiKeyTypeGuard(apiKey, [
                EnumApiKeyType.default,
            ]);

            expect(result).toBe(true);
        });
    });

    describe('validateApiKey', () => {
        type ValidateApiKey = (
            apiKey: IApiKey | null,
            includeActive?: boolean
        ) => asserts apiKey is IApiKey;

        it('throws ApiKeyNotFoundException when the api key is null', () => {
            const validateApiKey: ValidateApiKey = domain['validateApiKey'];

            let thrown: unknown;
            try {
                validateApiKey(null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'apiKey.error.notFound',
            });
        });

        it('throws ApiKeyInactiveException when includeActive is true and the api key is inactive', () => {
            apiKeyUtil.isActive.mockReturnValue(false);
            const validateApiKey: ValidateApiKey =
                domain['validateApiKey'].bind(domain);

            let thrown: unknown;
            try {
                validateApiKey(apiKey, true);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.inactive
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.inactive',
            });
        });

        it('returns with no throw when includeActive is false, whatever the active flag', () => {
            const validateApiKey: ValidateApiKey = domain['validateApiKey'];

            expect(() => validateApiKey(apiKey, false)).not.toThrow();
        });

        it('returns with no throw when includeActive is true and the api key is active', () => {
            apiKeyUtil.isActive.mockReturnValue(true);
            const validateApiKey: ValidateApiKey =
                domain['validateApiKey'].bind(domain);

            expect(() => validateApiKey(apiKey, true)).not.toThrow();
        });
    });

    describe('validateStartAtIsFuture', () => {
        it('throws ApiKeyStartAtNotFutureException when startAt is at or before now', () => {
            let thrown: unknown;
            try {
                domain['validateStartAtIsFuture'](now);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.startAtNotFuture,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.startAtNotFuture
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.startAtNotFuture',
            });
        });

        it('returns with no throw when startAt is after now', () => {
            const future = new Date('2026-02-01T00:00:00.000Z');

            expect(() =>
                domain['validateStartAtIsFuture'](future)
            ).not.toThrow();
        });
    });

    describe('prepareActivityLog', () => {
        it('maps the metadata and prepares the activity log event', () => {
            const metadata = { apiKeyId: apiKey.id };
            apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);

            const result = domain['prepareActivityLog'](
                EnumActivityLogAction.adminApiKeyCreate,
                apiKey,
                now,
                false
            );

            expect(result).toBe(stagedEvent);
            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyCreate,
                metadata,
                onError: false,
            });
        });
    });
});
