import type { ICacheInvalidateEffect } from '@common/cache/interfaces/cache.interface';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import { CacheService } from '@common/cache/services/cache.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagCacheSchema } from '@modules/feature-flag/constants/feature-flag.constant';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import type {
    IFeatureFlagMetadata,
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { OutboxService } from '@common/outbox/services/outbox.service';

describe('FeatureFlagService', () => {
    const featureFlagRepository: MockProxy<FeatureFlagRepository> =
        mock<FeatureFlagRepository>();
    const featureFlagCache: MockProxy<FeatureFlagCache> =
        mock<FeatureFlagCache>({
            featureFlagTtlInMs: 3600000,
        });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    let service: FeatureFlagService;

    const keys = [
        'FeatureFlag:loginWithGoogle',
        'FeatureFlag:Lease:loginWithGoogle',
    ];
    const cacheEffect: ICacheInvalidateEffect = {
        queue: EnumCacheQueue.cache,
        name: EnumCacheProcess.invalidate,
        data: { keys },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const hashForTenPercent = '0000000a'.padEnd(64, '0');
    const hashForFiftyPercent = '00000032'.padEnd(64, '0');

    const baseFlag: FeatureFlag = {
        id: '507f1f77bcf86cd799439011',
        key: EnumFeatureFlagKey.loginWithGoogle,
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        featureFlagCache.buildFeatureFlagKeys.mockReturnValue(keys);
        cacheService.invalidateEffect.mockReturnValue(cacheEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagService,
                {
                    provide: FeatureFlagRepository,
                    useValue: featureFlagRepository,
                },
                { provide: FeatureFlagCache, useValue: featureFlagCache },
                { provide: CacheService, useValue: cacheService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        service = module.get(FeatureFlagService);
    });

    describe('getByKey', () => {
        const lease = {
            key: 'FeatureFlag:Lease:loginWithGoogle',
            ttlInMs: 10000,
        };

        beforeEach(() => {
            featureFlagCache.buildFeatureFlagKey.mockReturnValue(
                'FeatureFlag:loginWithGoogle'
            );
            featureFlagCache.buildFeatureFlagLease.mockReturnValue(lease);
        });

        it('reads through with the entry key, FeatureFlagCacheSchema, the TTL, and the lease', async () => {
            cacheService.readThrough.mockResolvedValue(baseFlag);

            const result = await service.getByKey(
                EnumFeatureFlagKey.loginWithGoogle
            );

            expect(result).toBe(baseFlag);
            expect(featureFlagCache.buildFeatureFlagKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(featureFlagCache.buildFeatureFlagLease).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'FeatureFlag:loginWithGoogle',
                FeatureFlagCacheSchema,
                3600000,
                expect.any(Function),
                { lease }
            );
        });

        it('passes a loader that reads the repository by key', async () => {
            cacheService.readThrough.mockImplementation(
                async (_key, _schema, _ttlInMs, loader) => loader()
            );
            featureFlagRepository.findOneByKey.mockResolvedValue(baseFlag);

            const result = await service.getByKey(
                EnumFeatureFlagKey.loginWithGoogle
            );

            expect(result).toBe(baseFlag);
            expect(featureFlagRepository.findOneByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
        });

        it('returns null when the read-through answers null', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            const result = await service.getByKey(
                EnumFeatureFlagKey.loginWithGoogle
            );

            expect(result).toBeNull();
        });
    });

    describe('getMetadataByKey', () => {
        it('returns the metadata of the flag', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: { newFeature: true },
            });

            const result = await service.getMetadataByKey<{
                newFeature: boolean;
            }>(EnumFeatureFlagKey.loginWithGoogle);

            expect(result).toEqual({ newFeature: true });
        });

        it('returns null when no flag is found', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            const result = await service.getMetadataByKey(
                EnumFeatureFlagKey.loginWithGoogle
            );

            expect(result).toBeNull();
        });

        it('returns null when the flag carries no metadata', async () => {
            cacheService.readThrough.mockResolvedValue(baseFlag);

            const result = await service.getMetadataByKey(
                EnumFeatureFlagKey.loginWithGoogle
            );

            expect(result).toBeNull();
        });
    });

    describe('validateFeatureFlag', () => {
        it('throws FeatureFlagNotConfiguredException (500) when the flag is unregistered', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.workspace,
                    null,
                    null
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagNotConfiguredException,
                module: 'featureFlag',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.notConfigured
                    ],
                messagePath: 'featureFlag.error.notConfigured',
                rawError: expect.objectContaining({
                    message:
                        'FeatureFlagNotConfiguredException: no feature flag row for "workspace"',
                }),
            });
            expect(featureFlagCache.buildFeatureFlagKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace
            );
        });

        it('throws FeatureFlagDisabledException when the flag is disabled', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                isEnable: false,
            });

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    null,
                    null
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('resolves for a targeted user, bypassing rollout entirely', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 0,
                targetUserIds: ['user-1'],
            });

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    'user-1',
                    null
                )
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('resolves for an authenticated caller whose bucket is under rollout', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 50,
                targetUserIds: [],
            });
            helperHashService.sha256Hash.mockReturnValue(hashForTenPercent);

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    'user-1',
                    null
                )
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'loginWithGoogle:user-1'
            );
        });

        it('throws FeatureFlagDisabledException for an authenticated caller whose bucket misses rollout', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 10,
                targetUserIds: [],
            });
            helperHashService.sha256Hash.mockReturnValue(hashForFiftyPercent);

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    'user-1',
                    null
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('resolves with no user when the rollout is 100%, ignoring any anonymous header', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 100,
            });

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    null,
                    null
                )
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagDisabledException with no user, rollout under 100%, and no anonymous id', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 50,
            });

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    null,
                    null
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('resolves with no user, rollout under 100%, and an anonymous id under rollout', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 50,
            });
            helperHashService.sha256Hash.mockReturnValue(hashForTenPercent);

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    null,
                    'anon-1'
                )
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'loginWithGoogle:anon-1'
            );
        });

        it('throws FeatureFlagDisabledException with no user, rollout under 100%, and an anonymous id missing rollout', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                rolloutPercent: 10,
            });
            helperHashService.sha256Hash.mockReturnValue(hashForFiftyPercent);

            await expect(
                service.validateFeatureFlag(
                    EnumFeatureFlagKey.loginWithGoogle,
                    null,
                    'anon-1'
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });
    });

    describe('isMetadataAllowed', () => {
        it('returns true for an enabled flag whose sub-key holds true', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: true },
            });

            await expect(
                service.isMetadataAllowed(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).resolves.toBe(true);
        });

        it('returns false for an enabled flag whose sub-key holds false', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: false },
            });

            await expect(
                service.isMetadataAllowed(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).resolves.toBe(false);
        });

        it('returns false for a disabled flag', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                isEnable: false,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: true },
            });

            await expect(
                service.isMetadataAllowed(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).resolves.toBe(false);
        });

        it('returns false for a missing sub-key, a non-boolean sub-key, and null metadata', async () => {
            cacheService.readThrough.mockResolvedValueOnce({
                ...baseFlag,
                metadata: {},
            });
            cacheService.readThrough.mockResolvedValueOnce({
                ...baseFlag,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: 'yes' },
            });
            cacheService.readThrough.mockResolvedValueOnce({
                ...baseFlag,
                metadata: null,
            });

            for (let i = 0; i < 3; i++) {
                await expect(
                    service.isMetadataAllowed(
                        EnumFeatureFlagKey.loginWithGoogle,
                        EnumFeatureFlagMetadataKey.signUpAllowed
                    )
                ).resolves.toBe(false);
            }
        });

        it('throws FeatureFlagNotConfiguredException when the flag is unregistered', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            await expect(
                service.isMetadataAllowed(
                    EnumFeatureFlagKey.workspace,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',

                constructor: FeatureFlagNotConfiguredException,
                statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
            });
        });
    });

    describe('validateFeatureFlagMetadata', () => {
        it('throws FeatureFlagNotConfiguredException (500) when the flag is unregistered', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.workspace,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagNotConfiguredException,
                module: 'featureFlag',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.notConfigured
                    ],
                messagePath: 'featureFlag.error.notConfigured',
                rawError: expect.objectContaining({
                    message:
                        'FeatureFlagNotConfiguredException: no feature flag row for "workspace"',
                }),
            });
        });

        it('throws FeatureFlagDisabledException when the flag is disabled', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                isEnable: false,
            });

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('resolves when the metadata sub-key holds true', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: true },
            });

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).resolves.toBeUndefined();
        });

        it('throws FeatureFlagDisabledException when the metadata sub-key holds false', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: false },
            });

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('throws FeatureFlagDisabledException (404) when the metadata sub-key is not boolean', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: { [EnumFeatureFlagMetadataKey.signUpAllowed]: 'yes' },
            });

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                httpStatus: HttpStatus.NOT_FOUND,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('throws FeatureFlagDisabledException (404) when metadata carries no such sub-key', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: {},
            });

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                httpStatus: HttpStatus.NOT_FOUND,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });

        it('throws FeatureFlagDisabledException (404) when the flag carries no metadata at all', async () => {
            cacheService.readThrough.mockResolvedValue({
                ...baseFlag,
                metadata: null,
            });

            await expect(
                service.validateFeatureFlagMetadata(
                    EnumFeatureFlagKey.loginWithGoogle,
                    EnumFeatureFlagMetadataKey.signUpAllowed
                )
            ).rejects.toMatchObject({
                constructor: FeatureFlagDisabledException,
                httpStatus: HttpStatus.NOT_FOUND,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });
    });

    describe('getListByAdmin', () => {
        it('delegates to the offset pagination repository query', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                where: { OR: [] },
                orderBy: [],
                limit: 20,
                skip: 0,
            };
            const paginationReturn: IResponsePaginationReturn<FeatureFlag> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [baseFlag],
            };
            featureFlagRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                paginationReturn
            );

            const result = await service.getListByAdmin(pagination);

            expect(result).toBe(paginationReturn);
            expect(
                featureFlagRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('getListCursor', () => {
        it('delegates to the cursor pagination repository query', async () => {
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                where: { OR: [] },
                orderBy: [],
                limit: 20,
            };
            const paginationReturn: IResponsePaginationReturn<FeatureFlag> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [baseFlag],
            };
            featureFlagRepository.findWithPaginationCursor.mockResolvedValue(
                paginationReturn
            );

            const result = await service.getListCursor(pagination);

            expect(result).toBe(paginationReturn);
            expect(
                featureFlagRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('updateStatusByAdmin', () => {
        const statusUpdate: IFeatureFlagUpdateStatus = {
            isEnable: false,
            rolloutPercent: 0,
            targetUserIds: [],
        };

        it('throws FeatureFlagNotFoundException when the statement misses', async () => {
            featureFlagRepository.updateStatusInTx.mockResolvedValue(null);

            await expect(
                service.updateStatusByAdmin(
                    '507f1f77bcf86cd799439011',
                    statusUpdate
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.notFound,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.notFound
                    ],
                messagePath: 'featureFlag.error.notFound',
            });
            expect(featureFlagRepository.updateStatusInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439011',
                statusUpdate
            );
            expect(featureFlagRepository.findOneById).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('updates the status and adds the cache invalidation effect on the same tx', async () => {
            const updated = { ...baseFlag, isEnable: false };
            featureFlagRepository.updateStatusInTx.mockResolvedValue(updated);

            const result = await service.updateStatusByAdmin(
                '507f1f77bcf86cd799439011',
                statusUpdate
            );

            expect(result).toBe(updated);
            expect(featureFlagRepository.findOneById).not.toHaveBeenCalled();
            expect(featureFlagRepository.updateStatusInTx).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439011',
                statusUpdate
            );
            expect(featureFlagCache.buildFeatureFlagKeys).toHaveBeenCalledWith(
                updated.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });
    });

    describe('updateMetadataByAdmin', () => {
        const metadataUpdate: IFeatureFlagUpdateMetadata = {
            metadata: { enabled: true },
        };

        it('throws the notFound feature flag error when the flag does not exist', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateMetadataByAdmin(
                    '507f1f77bcf86cd799439011',
                    metadataUpdate
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.notFound,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.notFound
                    ],
                messagePath: 'featureFlag.error.notFound',
            });
            expect(
                featureFlagRepository.updateMetadataInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagInvalidMetadataException when the metadata shape changed', async () => {
            const stored = { ...baseFlag, metadata: { label: 'a' } };
            featureFlagRepository.findOneById.mockResolvedValue(stored);

            await expect(
                service.updateMetadataByAdmin(
                    '507f1f77bcf86cd799439011',
                    metadataUpdate
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.invalidMetadata,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.invalidMetadata
                    ],
                messagePath: 'featureFlag.error.invalidMetadata',
            });
            expect(
                featureFlagRepository.updateMetadataInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagInvalidMetadataException when the stored metadata is null', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(baseFlag);

            await expect(
                service.updateMetadataByAdmin(
                    '507f1f77bcf86cd799439011',
                    metadataUpdate
                )
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.invalidMetadata,
                messagePath: 'featureFlag.error.invalidMetadata',
            });
            expect(
                featureFlagRepository.updateMetadataInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('updates the metadata and adds the cache invalidation effect on the same tx', async () => {
            const stored = { ...baseFlag, metadata: { enabled: false } };
            const updated = { ...baseFlag, metadata: { enabled: true } };
            featureFlagRepository.findOneById.mockResolvedValue(stored);
            featureFlagRepository.updateMetadataInTx.mockResolvedValue(updated);

            const result = await service.updateMetadataByAdmin(
                '507f1f77bcf86cd799439011',
                metadataUpdate
            );

            expect(result).toBe(updated);
            expect(
                featureFlagRepository.updateMetadataInTx
            ).toHaveBeenCalledWith(
                tx,
                '507f1f77bcf86cd799439011',
                metadataUpdate
            );
            expect(featureFlagCache.buildFeatureFlagKeys).toHaveBeenCalledWith(
                updated.key
            );
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(keys);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });
    });

    describe('assertRollout', () => {
        it('resolves with no throw when the identifier is in rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForTenPercent);

            expect(() =>
                service['assertRollout'](
                    50,
                    EnumFeatureFlagKey.loginWithGoogle,
                    'user-1'
                )
            ).not.toThrow();
        });

        it('throws FeatureFlagDisabledException when the identifier is out of rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForFiftyPercent);

            let captured: unknown;
            try {
                service['assertRollout'](
                    10,
                    EnumFeatureFlagKey.loginWithGoogle,
                    'user-1'
                );
            } catch (error) {
                captured = error;
            }

            expect(captured).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
        });
    });

    describe('isInRollout', () => {
        it('hashes "<key>:<identifier>" and returns true when the bucket is under the rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForTenPercent);

            const result = service['isInRollout'](
                50,
                'loginWithGoogle',
                'user-1'
            );

            expect(result).toBe(true);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'loginWithGoogle:user-1'
            );
        });

        it('returns false when the bucket is at or above the rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForFiftyPercent);

            const result = service['isInRollout'](
                50,
                'loginWithGoogle',
                'user-1'
            );

            expect(result).toBe(false);
        });
    });

    describe('isMetadataValid', () => {
        it('returns true when keys match and every value keeps its type', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                newFeature: true,
                maxRetries: 3,
            };
            const newMetadata: IFeatureFlagMetadata = {
                newFeature: false,
                maxRetries: 5,
            };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                true
            );
        });

        it('returns false when the stored metadata is null', () => {
            const newMetadata: IFeatureFlagMetadata = { newFeature: true };

            expect(service['isMetadataValid'](null, newMetadata)).toBe(false);
        });

        it('returns false when the key sets differ', () => {
            const oldMetadata: IFeatureFlagMetadata = { newFeature: true };
            const newMetadata: IFeatureFlagMetadata = { maxRetries: 3 };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });

        it('returns false when a value changes primitive type', () => {
            const oldMetadata: IFeatureFlagMetadata = { newFeature: true };
            const newMetadata: IFeatureFlagMetadata = { newFeature: 'true' };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });

        it('returns false when an array value changes element type', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg', 'id'],
            };
            const newMetadata: IFeatureFlagMetadata = {
                allowedRegions: [1, 2],
            };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });

        it('returns true when an array value keeps its element type', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg'],
            };
            const newMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg', 'id'],
            };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                true
            );
        });

        it('returns false when a new value is undefined', () => {
            const oldMetadata: IFeatureFlagMetadata = { label: 'a' };
            const newMetadata = {
                label: undefined,
            } as unknown as IFeatureFlagMetadata;

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });

        it('returns false when a new value is null', () => {
            const oldMetadata: IFeatureFlagMetadata = { label: 'a' };
            const newMetadata = {
                label: null,
            } as unknown as IFeatureFlagMetadata;

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });

        it('returns false when a new value is an empty string', () => {
            const oldMetadata: IFeatureFlagMetadata = { label: 'a' };
            const newMetadata: IFeatureFlagMetadata = { label: '' };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });

        it('returns false when a new array value is empty', () => {
            const oldMetadata: IFeatureFlagMetadata = {
                allowedRegions: ['sg'],
            };
            const newMetadata: IFeatureFlagMetadata = { allowedRegions: [] };

            expect(service['isMetadataValid'](oldMetadata, newMetadata)).toBe(
                false
            );
        });
    });

    describe('metadataValueType', () => {
        it('returns "array" for an empty array', () => {
            expect(service['metadataValueType']([])).toBe('array');
        });

        it('returns "array:<element type>" for a non-empty array', () => {
            expect(service['metadataValueType'](['sg', 'id'])).toBe(
                'array:string'
            );
            expect(service['metadataValueType']([1, 2])).toBe('array:number');
        });

        it('returns the primitive typeof for a non-array value', () => {
            expect(service['metadataValueType']('a')).toBe('string');
            expect(service['metadataValueType'](3)).toBe('number');
            expect(service['metadataValueType'](true)).toBe('boolean');
        });
    });
});
