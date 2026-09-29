import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { FeatureFlagPredefinedKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-empty.exception';
import { FeatureFlagPredefinedKeyLengthExceededException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-length-exceeded.exception';
import { FeatureFlagPredefinedKeyNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-not-found.exception';
import { FeatureFlagPredefinedKeyTypeInvalidException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-type-invalid.exception';
import { FeatureFlagServiceUnavailableException } from '@modules/feature-flag/exceptions/feature-flag.service-unavailable.exception';
import type {
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';

function hashForPercentage(percentage: number): string {
    return percentage.toString(16).padStart(8, '0') + '0'.repeat(56);
}

describe('FeatureFlagDomain', () => {
    const featureFlagRepository = mock<FeatureFlagRepository>();
    const featureFlagUtil = mock<FeatureFlagUtil>();
    const featureFlagCache = mock<FeatureFlagCache>();
    const helperHashService = mock<HelperHashService>();
    let domain: FeatureFlagDomain;

    const buildFlag = (overrides: Partial<FeatureFlag> = {}): FeatureFlag => ({
        id: '507f1f77bcf86cd799439011',
        key: 'loginWithGoogle',
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        ...overrides,
    });

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagDomain,
                {
                    provide: FeatureFlagRepository,
                    useValue: featureFlagRepository,
                },
                { provide: FeatureFlagUtil, useValue: featureFlagUtil },
                { provide: FeatureFlagCache, useValue: featureFlagCache },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();
        domain = module.get(FeatureFlagDomain);
    });

    describe('checkRolloutPercentage', () => {
        it('hashes "<key>:<identifier>" and returns true when the bucket is under the rollout', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(10));

            const result = domain.checkRolloutPercentage(
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
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(50));

            const result = domain.checkRolloutPercentage(
                50,
                'loginWithGoogle',
                'user-1'
            );

            expect(result).toBe(false);
        });
    });

    describe('validateFeatureFlag', () => {
        it('throws FeatureFlagPredefinedKeyEmptyException on an empty key segment', async () => {
            await expect(
                domain.validateFeatureFlag('changePassword.', null, null)
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.predefinedKeyEmpty,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyEmpty
                    ],
                messagePath: 'featureFlag.error.predefinedKeyEmpty',
            });
            await expect(
                domain.validateFeatureFlag('changePassword.', null, null)
            ).rejects.toBeInstanceOf(FeatureFlagPredefinedKeyEmptyException);
        });

        it('throws FeatureFlagPredefinedKeyLengthExceededException on a dotted key', async () => {
            await expect(
                domain.validateFeatureFlag('workspace.metadataKey', null, null)
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyLengthExceeded,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError
                            .predefinedKeyLengthExceeded
                    ],
                messagePath: 'featureFlag.error.predefinedKeyLengthExceeded',
            });
            await expect(
                domain.validateFeatureFlag('workspace.metadataKey', null, null)
            ).rejects.toBeInstanceOf(
                FeatureFlagPredefinedKeyLengthExceededException
            );
        });

        it('throws FeatureFlagPredefinedKeyNotFoundException when the flag is unregistered', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(null);

            await expect(
                domain.validateFeatureFlag('unknownFlag', null, null)
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyNotFound,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyNotFound
                    ],
                messagePath: 'featureFlag.error.predefinedKeyNotFound',
            });
            await expect(
                domain.validateFeatureFlag('unknownFlag', null, null)
            ).rejects.toBeInstanceOf(FeatureFlagPredefinedKeyNotFoundException);
            expect(featureFlagCache.getByKeyAndCache).toHaveBeenCalledWith(
                'unknownFlag'
            );
        });

        it('throws FeatureFlagServiceUnavailableException when the flag is disabled', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ isEnable: false })
            );

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', null, null)
            ).rejects.toMatchObject({
                constructor: FeatureFlagServiceUnavailableException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });

        it('resolves for a targeted user, bypassing rollout entirely', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 0, targetUserIds: ['user-1'] })
            );

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', 'user-1', null)
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('resolves for an authenticated caller whose bucket is under rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 50, targetUserIds: [] })
            );
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(10));

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', 'user-1', null)
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'loginWithGoogle:user-1'
            );
        });

        it('throws FeatureFlagServiceUnavailableException for an authenticated caller whose bucket misses rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 10, targetUserIds: [] })
            );
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(50));

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', 'user-1', null)
            ).rejects.toMatchObject({
                constructor: FeatureFlagServiceUnavailableException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });

        it('resolves with no user when the rollout is 100%, ignoring any anonymous header', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 100 })
            );

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', null, null)
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagServiceUnavailableException with no user, rollout under 100%, and no anonymous id', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 50 })
            );

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', null, null)
            ).rejects.toMatchObject({
                constructor: FeatureFlagServiceUnavailableException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });

        it('resolves with no user, rollout under 100%, and an anonymous id under rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 50 })
            );
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(10));

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', null, 'anon-1')
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'loginWithGoogle:anon-1'
            );
        });

        it('throws FeatureFlagServiceUnavailableException with no user, rollout under 100%, and an anonymous id missing rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ rolloutPercent: 10 })
            );
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(50));

            await expect(
                domain.validateFeatureFlag('loginWithGoogle', null, 'anon-1')
            ).rejects.toMatchObject({
                constructor: FeatureFlagServiceUnavailableException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });
    });

    describe('validateFeatureFlagMetadata', () => {
        it('throws FeatureFlagPredefinedKeyNotFoundException when the flag is unregistered', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(null);

            await expect(
                domain.validateFeatureFlagMetadata('unknownFlag', 'enabled')
            ).rejects.toMatchObject({
                constructor: FeatureFlagPredefinedKeyNotFoundException,
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyNotFound,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyNotFound
                    ],
                messagePath: 'featureFlag.error.predefinedKeyNotFound',
            });
        });

        it('throws FeatureFlagServiceUnavailableException when the flag is disabled', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ isEnable: false })
            );

            await expect(
                domain.validateFeatureFlagMetadata('loginWithGoogle', 'enabled')
            ).rejects.toMatchObject({
                constructor: FeatureFlagServiceUnavailableException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });

        it('resolves when the metadata sub-key holds true', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ metadata: { enabled: true } })
            );

            await expect(
                domain.validateFeatureFlagMetadata('loginWithGoogle', 'enabled')
            ).resolves.toBeUndefined();
        });

        it('throws FeatureFlagServiceUnavailableException when the metadata sub-key holds false', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ metadata: { enabled: false } })
            );

            await expect(
                domain.validateFeatureFlagMetadata('loginWithGoogle', 'enabled')
            ).rejects.toMatchObject({
                constructor: FeatureFlagServiceUnavailableException,
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });

        it('throws FeatureFlagPredefinedKeyTypeInvalidException when the metadata sub-key is not boolean', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ metadata: { enabled: 'yes' } })
            );

            await expect(
                domain.validateFeatureFlagMetadata('loginWithGoogle', 'enabled')
            ).rejects.toMatchObject({
                constructor: FeatureFlagPredefinedKeyTypeInvalidException,
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid
                    ],
                messagePath: 'featureFlag.error.predefinedKeyTypeInvalid',
            });
        });

        it('throws FeatureFlagPredefinedKeyTypeInvalidException when metadata carries no such sub-key', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ metadata: {} })
            );

            await expect(
                domain.validateFeatureFlagMetadata('loginWithGoogle', 'enabled')
            ).rejects.toMatchObject({
                constructor: FeatureFlagPredefinedKeyTypeInvalidException,
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid
                    ],
                messagePath: 'featureFlag.error.predefinedKeyTypeInvalid',
            });
        });

        it('throws FeatureFlagPredefinedKeyTypeInvalidException when the flag carries no metadata at all', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(
                buildFlag({ metadata: null })
            );

            await expect(
                domain.validateFeatureFlagMetadata('loginWithGoogle', 'enabled')
            ).rejects.toMatchObject({
                constructor: FeatureFlagPredefinedKeyTypeInvalidException,
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid
                    ],
                messagePath: 'featureFlag.error.predefinedKeyTypeInvalid',
            });
        });
    });

    describe('getListByAdmin', () => {
        it('delegates to the offset pagination repository query', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput> =
                {
                    where: {},
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
                data: [buildFlag()],
            };
            featureFlagRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                paginationReturn
            );

            const result = await domain.getListByAdmin(pagination);

            expect(result).toBe(paginationReturn);
            expect(
                featureFlagRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('getListCursor', () => {
        it('delegates to the cursor pagination repository query', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput> =
                {
                    where: {},
                    orderBy: [],
                    limit: 20,
                };
            const paginationReturn: IResponsePaginationReturn<FeatureFlag> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [buildFlag()],
            };
            featureFlagRepository.findWithPaginationCursor.mockResolvedValue(
                paginationReturn
            );

            const result = await domain.getListCursor(pagination);

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
        };

        it('throws FeatureFlagNotFoundException when the flag does not exist', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateStatusByAdmin(
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
            await expect(
                domain.updateStatusByAdmin(
                    '507f1f77bcf86cd799439011',
                    statusUpdate
                )
            ).rejects.toBeInstanceOf(FeatureFlagNotFoundException);
            expect(featureFlagRepository.updateStatus).not.toHaveBeenCalled();
        });

        it('updates the status and evicts the cache entry by the stored key', async () => {
            const stored = buildFlag();
            const updated = buildFlag({ isEnable: false });
            featureFlagRepository.findOneById.mockResolvedValue(stored);
            featureFlagRepository.updateStatus.mockResolvedValue(updated);

            const result = await domain.updateStatusByAdmin(
                '507f1f77bcf86cd799439011',
                statusUpdate
            );

            expect(result).toBe(updated);
            expect(featureFlagRepository.updateStatus).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                statusUpdate
            );
            expect(featureFlagCache.deleteCacheByKey).toHaveBeenCalledWith(
                stored.key
            );
        });
    });

    describe('updateMetadataByAdmin', () => {
        const metadataUpdate: IFeatureFlagUpdateMetadata = {
            metadata: { enabled: true },
        };

        it('throws FeatureFlagNotFoundException when the flag does not exist', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateMetadataByAdmin(
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
            await expect(
                domain.updateMetadataByAdmin(
                    '507f1f77bcf86cd799439011',
                    metadataUpdate
                )
            ).rejects.toBeInstanceOf(FeatureFlagNotFoundException);
            expect(featureFlagUtil.checkMetadataKey).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagInvalidMetadataException when the metadata shape changed', async () => {
            const stored = buildFlag({ metadata: { enabled: true } });
            featureFlagRepository.findOneById.mockResolvedValue(stored);
            featureFlagUtil.checkMetadataKey.mockReturnValue(false);

            await expect(
                domain.updateMetadataByAdmin(
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
            await expect(
                domain.updateMetadataByAdmin(
                    '507f1f77bcf86cd799439011',
                    metadataUpdate
                )
            ).rejects.toBeInstanceOf(FeatureFlagInvalidMetadataException);
            expect(featureFlagUtil.checkMetadataKey).toHaveBeenCalledWith(
                stored.metadata,
                metadataUpdate.metadata
            );
            expect(featureFlagRepository.updateMetadata).not.toHaveBeenCalled();
        });

        it('updates the metadata and evicts the cache entry by the stored key', async () => {
            const stored = buildFlag({ metadata: { enabled: false } });
            const updated = buildFlag({ metadata: { enabled: true } });
            featureFlagRepository.findOneById.mockResolvedValue(stored);
            featureFlagUtil.checkMetadataKey.mockReturnValue(true);
            featureFlagRepository.updateMetadata.mockResolvedValue(updated);

            const result = await domain.updateMetadataByAdmin(
                '507f1f77bcf86cd799439011',
                metadataUpdate
            );

            expect(result).toBe(updated);
            expect(featureFlagRepository.updateMetadata).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                metadataUpdate
            );
            expect(featureFlagCache.deleteCacheByKey).toHaveBeenCalledWith(
                stored.key
            );
        });
    });

    describe('assertRollout', () => {
        it('resolves with no throw when checkRolloutPercentage is true', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(10));

            expect(() =>
                domain['assertRollout'](50, 'loginWithGoogle', 'user-1')
            ).not.toThrow();
        });

        it('throws FeatureFlagServiceUnavailableException when checkRolloutPercentage is false', () => {
            helperHashService.sha256Hash.mockReturnValue(hashForPercentage(50));

            let captured: unknown;
            try {
                domain['assertRollout'](10, 'loginWithGoogle', 'user-1');
            } catch (error) {
                captured = error;
            }

            expect(captured).toBeInstanceOf(
                FeatureFlagServiceUnavailableException
            );
            expect(captured).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });
    });
});
