import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { FeatureFlagPredefinedKeyLengthExceededException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-length-exceeded.exception';
import type { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagPredefinedKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-empty.exception';
import { FeatureFlagPredefinedKeyNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-not-found.exception';
import { FeatureFlagPredefinedKeyTypeInvalidException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-type-invalid.exception';
import { FeatureFlagServiceUnavailableException } from '@modules/feature-flag/exceptions/feature-flag.service-unavailable.exception';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('FeatureFlagDomain', () => {
    const featureFlagRepository: MockProxy<FeatureFlagRepository> =
        mock<FeatureFlagRepository>();
    const featureFlagCache: MockProxy<FeatureFlagCache> =
        mock<FeatureFlagCache>();
    const featureFlagUtil: MockProxy<FeatureFlagUtil> = mock<FeatureFlagUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

    const featureFlag = {
        id: 'flag-id',
        key: 'new-home',
        description: 'New home page',
        isEnable: true,
        rolloutPercent: 50,
        metadata: { color: 'blue' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: null,
        targetUsers: [],
    } satisfies IFeatureFlagWithTargetUsers;

    let service: FeatureFlagDomain;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagDomain,
                {
                    provide: FeatureFlagRepository,
                    useValue: featureFlagRepository,
                },
                { provide: FeatureFlagUtil, useValue: featureFlagUtil },
                {
                    provide: FeatureFlagCache,
                    useValue: featureFlagCache,
                },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();
        service = moduleRef.get(FeatureFlagDomain);
    });

    describe('validateFeatureFlag', () => {
        it('rejects an empty key segment before reading the cache', async () => {
            await expect(
                service.validateFeatureFlag('login.', null, null)
            ).rejects.toBeInstanceOf(FeatureFlagPredefinedKeyEmptyException);
            expect(featureFlagCache.getByKeyAndCache).not.toHaveBeenCalled();
        });

        it('rejects an unknown or disabled flag without failing open', async () => {
            featureFlagCache.getByKeyAndCache
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ ...featureFlag, isEnable: false });

            await expect(
                service.validateFeatureFlag('new-home', null, null)
            ).rejects.toBeInstanceOf(FeatureFlagPredefinedKeyNotFoundException);
            await expect(
                service.validateFeatureFlag('new-home', 'user-id', null)
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });

        it('allows an explicitly targeted user even at zero rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                rolloutPercent: 0,
                targetUsers: [
                    {
                        id: 'target-id',
                        featureFlagId: featureFlag.id,
                        userId: 'user-id',
                    },
                ],
            });

            await expect(
                service.validateFeatureFlag('new-home', 'user-id', null)
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('uses a flag-salted deterministic bucket for an untargeted user', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(featureFlag);
            helperHashService.sha256Hash.mockReturnValue('00000031ffff');

            await expect(
                service.validateFeatureFlag('new-home', 'user-id', null)
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'new-home:user-id'
            );
        });

        it('rejects a nested key path before reading the cache', async () => {
            await expect(
                service.validateFeatureFlag('login.nested', null, null)
            ).rejects.toBeInstanceOf(
                FeatureFlagPredefinedKeyLengthExceededException
            );
            expect(featureFlagCache.getByKeyAndCache).not.toHaveBeenCalled();
        });

        it('rejects an untargeted user whose bucket falls outside the rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(featureFlag);
            helperHashService.sha256Hash.mockReturnValue('00000063ffff');

            await expect(
                service.validateFeatureFlag('new-home', 'user-id', null)
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });

        it('allows an anonymous caller at full rollout without hashing', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                rolloutPercent: 100,
            });

            await expect(
                service.validateFeatureFlag('new-home', null, null)
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('buckets an anonymous caller by the anonymous id below full rollout', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(featureFlag);
            helperHashService.sha256Hash.mockReturnValue('00000031ffff');

            await expect(
                service.validateFeatureFlag('new-home', null, 'anonymous-id')
            ).resolves.toBeUndefined();
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'new-home:anonymous-id'
            );

            helperHashService.sha256Hash.mockReturnValue('00000063ffff');
            await expect(
                service.validateFeatureFlag('new-home', null, 'anonymous-id')
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });

        it('rejects an anonymous caller below full rollout without a usable id', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(featureFlag);

            await expect(
                service.validateFeatureFlag('new-home', null, null)
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });
    });

    describe('validateFeatureFlagMetadata', () => {
        it('accepts only a true boolean metadata gate', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                metadata: { allowed: true },
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).resolves.toBeUndefined();
        });

        it('rejects an unknown flag', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue(null);

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).rejects.toBeInstanceOf(FeatureFlagPredefinedKeyNotFoundException);
        });

        it('rejects a disabled flag as unavailable', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                isEnable: false,
                metadata: { allowed: true },
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });

        it('rejects a flag without metadata as a type violation', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                metadata: null,
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).rejects.toBeInstanceOf(
                FeatureFlagPredefinedKeyTypeInvalidException
            );
        });

        it('rejects a non-boolean metadata gate', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                metadata: { allowed: 'yes' },
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).rejects.toBeInstanceOf(
                FeatureFlagPredefinedKeyTypeInvalidException
            );
        });

        it('rejects a false metadata gate as unavailable', async () => {
            featureFlagCache.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                metadata: { allowed: false },
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });
    });

    describe('getListByAdmin', () => {
        const pagination = { limit: 10, skip: 0, orderBy: [] };
        const page = {
            type: EnumPaginationType.offset as const,
            count: 0,
            perPage: 10,
            page: 1,
            totalPage: 0,
            hasNext: false,
            hasPrevious: false,
            data: [],
        };

        it('forwards the accessible where as the trailing repository argument', async () => {
            const accessibleWhere = { isEnable: true };
            featureFlagRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            await expect(
                service.getListByAdmin(pagination, accessibleWhere)
            ).resolves.toBe(page);
            expect(
                featureFlagRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, accessibleWhere);
        });

        it('passes undefined to the repository when no where is given', async () => {
            featureFlagRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            await service.getListByAdmin(pagination);

            expect(
                featureFlagRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenLastCalledWith(pagination, undefined);
        });
    });

    describe('getListCursor', () => {
        it('delegates the cursor pagination to the repository', async () => {
            const pagination = {
                limit: 10,
                cursor: undefined,
                cursorField: 'id',
                orderBy: [],
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                count: 0,
                perPage: 10,
                hasNext: false,
                cursor: undefined,
                data: [],
            };
            featureFlagRepository.findWithPaginationCursor.mockResolvedValue(
                page
            );

            await expect(service.getListCursor(pagination)).resolves.toBe(page);
            expect(
                featureFlagRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('getOne', () => {
        it('returns the stored flag without judging it', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(featureFlag);

            await expect(service.getOne(featureFlag.id)).resolves.toEqual(
                featureFlag
            );
            expect(featureFlagRepository.findOneById).toHaveBeenCalledWith(
                featureFlag.id
            );
        });

        it('throws FeatureFlagNotFoundException when the flag is unknown', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(null);

            await expect(service.getOne('unknown')).rejects.toBeInstanceOf(
                FeatureFlagNotFoundException
            );
        });
    });

    describe('updateStatusByAdmin', () => {
        it('throws FeatureFlagNotFoundException when the flag is unknown', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateStatusByAdmin('flag-id', {
                    isEnable: true,
                    rolloutPercent: 50,
                })
            ).rejects.toBeInstanceOf(FeatureFlagNotFoundException);
            expect(featureFlagRepository.updateStatus).not.toHaveBeenCalled();
        });
    });

    describe('updateMetadataByAdmin', () => {
        it('throws FeatureFlagNotFoundException when the flag is unknown', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateMetadataByAdmin('flag-id', { metadata: {} })
            ).rejects.toBeInstanceOf(FeatureFlagNotFoundException);
            expect(featureFlagRepository.updateMetadata).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagInvalidMetadataException when the keys do not match the stored metadata', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(featureFlag);
            featureFlagUtil.checkMetadataKey.mockReturnValue(false);

            await expect(
                service.updateMetadataByAdmin('flag-id', {
                    metadata: { other: true },
                })
            ).rejects.toBeInstanceOf(FeatureFlagInvalidMetadataException);
            expect(featureFlagUtil.checkMetadataKey).toHaveBeenCalledWith(
                featureFlag.metadata,
                { other: true }
            );
            expect(featureFlagRepository.updateMetadata).not.toHaveBeenCalled();
        });

        it('updates the metadata and invalidates the flag cache', async () => {
            featureFlagRepository.findOneById.mockResolvedValue(featureFlag);
            featureFlagUtil.checkMetadataKey.mockReturnValue(true);
            featureFlagRepository.updateMetadata.mockResolvedValue(featureFlag);

            await expect(
                service.updateMetadataByAdmin('flag-id', {
                    metadata: { color: 'red' },
                })
            ).resolves.toBe(featureFlag);
            expect(featureFlagRepository.updateMetadata).toHaveBeenCalledWith(
                'flag-id',
                { metadata: { color: 'red' } }
            );
            expect(featureFlagCache.deleteCacheByKey).toHaveBeenCalledWith(
                'new-home'
            );
        });
    });

    it('updates status and invalidates the flag cache', async () => {
        featureFlagRepository.findOneById.mockResolvedValue(featureFlag);
        featureFlagRepository.updateStatus.mockResolvedValue(featureFlag);

        await expect(
            service.updateStatusByAdmin('flag-id', {
                isEnable: true,
                rolloutPercent: 50,
            })
        ).resolves.toBe(featureFlag);

        expect(featureFlagRepository.updateStatus).toHaveBeenCalledWith(
            'flag-id',
            { isEnable: true, rolloutPercent: 50 }
        );
        expect(featureFlagCache.deleteCacheByKey).toHaveBeenCalledWith(
            'new-home'
        );
    });
});
