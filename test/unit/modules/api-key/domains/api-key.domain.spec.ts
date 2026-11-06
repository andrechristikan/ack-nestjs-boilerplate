import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationOffsetReturn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey, Prisma } from '@generated/prisma-client/client';
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

    let domain: ApiKeyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.isActive.mockImplementation(key => key.isActive);

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
                null,
                null
            );
        });

        it('forwards the active and type filters to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.ApiKeyWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
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

            const result = await domain.getListByAdmin(
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

    describe('createByAdmin', () => {
        const create: IApiKeyCreate = {
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            startAt: null,
            endAt: null,
        };

        beforeEach(() => {
            apiKeyCredentialUtil.generateCredential.mockReturnValue({
                key: 'local_abc123',
                secret: 'plain-secret',
                hash: 'hashed-secret',
            });
            apiKeyRepository.create.mockResolvedValue(apiKey);
        });

        it('creates the api key under the given id with no date window', async () => {
            const result = await domain.createByAdmin('api-key-1', create);

            expect(result).toEqual({ apiKey, secret: 'plain-secret' });
            expect(apiKeyRepository.create).toHaveBeenCalledWith(
                'api-key-1',
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: null,
                    endAt: null,
                },
                'local_abc123',
                'hashed-secret'
            );
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

            await domain.createByAdmin('api-key-1', {
                ...create,
                startAt,
                endAt,
            });

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
        });

        it('throws ApiKeyStartAtNotFutureException when startAt is not in the future', async () => {
            const startAt = new Date('2025-01-01T00:00:00.000Z');

            await expect(
                domain.createByAdmin('api-key-1', { ...create, startAt })
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

        it('updates the status and purges the cache', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(false);
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyRepository.updateStatus.mockResolvedValue(updated);

            const result = await domain.updateStatusByAdmin(apiKey.id, false);

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateStatus).toHaveBeenCalledWith(
                apiKey.id,
                apiKey.isActive,
                false
            );
            expect(apiKeyCache.deleteApiKey).toHaveBeenCalledWith(apiKey.key);
        });

        it('throws ApiKeyNotFoundException when the guarded write misses', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyUtil.isExpired.mockReturnValue(false);
            apiKeyRepository.updateStatus.mockResolvedValue(null);

            await expect(
                domain.updateStatusByAdmin(apiKey.id, false)
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
            expect(apiKeyCache.deleteApiKey).not.toHaveBeenCalled();
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

        it('renames the api key and purges the cache after the write', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            const renamed: ApiKey = { ...apiKey, name: 'New Name' };
            const callOrder: string[] = [];
            apiKeyRepository.updateName.mockImplementation(async () => {
                callOrder.push('updateName');
                return renamed;
            });
            apiKeyCache.deleteApiKey.mockImplementation(async () => {
                callOrder.push('deleteApiKey');
            });

            const result = await domain.updateByAdmin(apiKey.id, 'New Name');

            expect(result).toBe(renamed);
            expect(apiKeyRepository.updateName).toHaveBeenCalledWith(
                apiKey.id,
                'New Name'
            );
            expect(apiKeyCache.deleteApiKey).toHaveBeenCalledWith(apiKey.key);
            expect(callOrder).toEqual(['updateName', 'deleteApiKey']);
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
            apiKeyRepository.findOneById.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });

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

        it('normalizes and updates the date window and purges the cache after the write', async () => {
            const startAtDay = new Date('2026-02-01T00:00:00.000Z');
            const endAtDay = new Date('2026-03-01T23:59:59.999Z');
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
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
            apiKeyCache.deleteApiKey.mockImplementation(async () => {
                callOrder.push('deleteApiKey');
            });

            const result = await domain.updateDatesByAdmin(
                apiKey.id,
                startAt,
                endAt
            );

            expect(result).toBe(updated);
            expect(apiKeyRepository.updateDates).toHaveBeenCalledWith(
                apiKey.id,
                startAtDay,
                endAtDay
            );
            expect(apiKeyCache.deleteApiKey).toHaveBeenCalledWith(apiKey.key);
            expect(callOrder).toEqual(['updateDates', 'deleteApiKey']);
        });

        it('throws ApiKeyInactiveException when the guarded write misses', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyRepository.updateDates.mockResolvedValue(null);

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
            expect(apiKeyCache.deleteApiKey).not.toHaveBeenCalled();
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
            apiKeyRepository.findOneById.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });

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

        it('creates a new secret, updates the hash, and purges the cache after the write', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.createSecret.mockReturnValue('new-secret');
            apiKeyCredentialUtil.createHash.mockReturnValue('new-hash');
            const updated: ApiKey = { ...apiKey, hash: 'new-hash' };
            const callOrder: string[] = [];
            apiKeyRepository.updateHash.mockImplementation(async () => {
                callOrder.push('updateHash');
                return updated;
            });
            apiKeyCache.deleteApiKey.mockImplementation(async () => {
                callOrder.push('deleteApiKey');
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
            expect(apiKeyCache.deleteApiKey).toHaveBeenCalledWith(apiKey.key);
            expect(callOrder).toEqual(['updateHash', 'deleteApiKey']);
        });

        it('throws ApiKeyInactiveException when the guarded write misses', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.createSecret.mockReturnValue('new-secret');
            apiKeyCredentialUtil.createHash.mockReturnValue('new-hash');
            apiKeyRepository.updateHash.mockResolvedValue(null);

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
            expect(apiKeyCache.deleteApiKey).not.toHaveBeenCalled();
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

        it('deletes the api key, purges the cache, and returns the row it read', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyRepository.delete.mockResolvedValue(true);

            const result = await domain.deleteByAdmin(apiKey.id);

            expect(result).toBe(apiKey);
            expect(apiKeyRepository.delete).toHaveBeenCalledWith(apiKey.id);
            expect(apiKeyCache.deleteApiKey).toHaveBeenCalledWith(apiKey.key);
        });

        it('throws ApiKeyNotFoundException when the guarded write misses', async () => {
            apiKeyRepository.findOneById.mockResolvedValue(apiKey);
            apiKeyRepository.delete.mockResolvedValue(false);

            await expect(domain.deleteByAdmin(apiKey.id)).rejects.toMatchObject(
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
            expect(apiKeyCache.deleteApiKey).not.toHaveBeenCalled();
        });
    });

    describe('validateXApiKey', () => {
        beforeEach(() => {
            apiKeyCredentialUtil.parseHeader.mockReturnValue({
                key: 'local_abc123',
                secret: 'secret-1',
            });
        });

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

        it('throws ApiKeyXApiKeyInvalidException when the header does not parse', async () => {
            apiKeyCredentialUtil.parseHeader.mockReturnValue(null);

            await expect(
                domain.validateXApiKey('  local_abc123  ')
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
            expect(apiKeyCredentialUtil.parseHeader).toHaveBeenCalledWith(
                'local_abc123'
            );
            expect(apiKeyCache.getApiKey).not.toHaveBeenCalled();
        });

        it('throws ApiKeyXApiKeyInvalidException when no api key matches the key half', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(null);

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

        it('throws ApiKeyXApiKeyInvalidException when the credential does not match', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(false);

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
            expect(apiKeyCache.setApiKey).not.toHaveBeenCalled();
        });

        it('throws ApiKeyXApiKeyInvalidException when the key is inactive', async () => {
            apiKeyCache.getApiKey.mockResolvedValue({
                ...apiKey,
                isActive: false,
            });
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);

            await expect(
                domain.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
        });

        it('throws ApiKeyXApiKeyInvalidException when the key is not yet active', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(true);

            await expect(
                domain.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            });
        });

        it('throws ApiKeyExpiredException on a cache hit whose endAt is past', async () => {
            const expiredApiKey: ApiKey = {
                ...apiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-01-10T00:00:00.000Z'),
            };
            apiKeyCache.getApiKey.mockResolvedValue(expiredApiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(false);
            apiKeyUtil.isExpired.mockReturnValue(true);

            await expect(
                domain.validateXApiKey('local_abc123:secret-1')
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
            expect(apiKeyUtil.isExpired).toHaveBeenCalledWith(
                expiredApiKey.endAt,
                now
            );
            expect(apiKeyRepository.findOneByKey).not.toHaveBeenCalled();
        });

        it('throws ApiKeyExpiredException on a cache miss with a past endAt without caching', async () => {
            const expiredApiKey: ApiKey = {
                ...apiKey,
                startAt: new Date('2026-01-01T00:00:00.000Z'),
                endAt: new Date('2026-01-10T00:00:00.000Z'),
            };
            apiKeyCache.getApiKey.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(expiredApiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(false);
            apiKeyUtil.isExpired.mockReturnValue(true);

            await expect(
                domain.validateXApiKey('local_abc123:secret-1')
            ).rejects.toMatchObject({
                statusCode: EnumApiKeyStatusCodeError.expired,
            });
            expect(apiKeyCache.setApiKey).not.toHaveBeenCalled();
        });

        it('returns the cached api key without reading the repository on a cache hit', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(false);
            apiKeyUtil.isExpired.mockReturnValue(false);

            const result = await domain.validateXApiKey(
                'local_abc123:secret-1'
            );

            expect(result).toBe(apiKey);
            expect(
                apiKeyCredentialUtil.validateCredential
            ).toHaveBeenCalledWith('local_abc123', 'secret-1', apiKey);
            expect(apiKeyRepository.findOneByKey).not.toHaveBeenCalled();
            expect(apiKeyCache.setApiKey).not.toHaveBeenCalled();
        });

        it('takes the lease, reads the repository, and caches the validated key with the lease token on a cache miss', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(null);
            apiKeyCache.takeApiKeyLease.mockResolvedValue('lease-token');
            apiKeyRepository.findOneByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(false);
            apiKeyUtil.isExpired.mockReturnValue(false);

            const result = await domain.validateXApiKey(
                'local_abc123:secret-1'
            );

            expect(result).toBe(apiKey);
            expect(apiKeyCache.takeApiKeyLease).toHaveBeenCalledWith(
                'local_abc123'
            );
            expect(apiKeyCache.takeApiKeyLease).toHaveBeenCalledBefore(
                apiKeyRepository.findOneByKey
            );
            expect(apiKeyCache.setApiKey).toHaveBeenCalledWith(
                apiKey,
                'lease-token'
            );
        });

        it('serves the repository row without caching when another reader holds the lease', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(null);
            apiKeyCache.takeApiKeyLease.mockResolvedValue(null);
            apiKeyRepository.findOneByKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(false);
            apiKeyUtil.isExpired.mockReturnValue(false);

            const result = await domain.validateXApiKey(
                'local_abc123:secret-1'
            );

            expect(result).toBe(apiKey);
            expect(apiKeyCache.setApiKey).not.toHaveBeenCalled();
        });

        it('takes no lease on a cache hit', async () => {
            apiKeyCache.getApiKey.mockResolvedValue(apiKey);
            apiKeyCredentialUtil.validateCredential.mockReturnValue(true);
            apiKeyUtil.isNotYetActive.mockReturnValue(false);
            apiKeyUtil.isExpired.mockReturnValue(false);

            await domain.validateXApiKey('local_abc123:secret-1');

            expect(apiKeyCache.takeApiKeyLease).not.toHaveBeenCalled();
        });
    });

    describe('validateXApiKeyTypeGuard', () => {
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
            const validateApiKey: ValidateApiKey =
                domain['validateApiKey'].bind(domain);

            let thrown: unknown;
            try {
                validateApiKey({ ...apiKey, isActive: false }, true);
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
});
