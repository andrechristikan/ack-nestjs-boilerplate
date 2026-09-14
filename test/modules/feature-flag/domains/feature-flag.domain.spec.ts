import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagPredefinedKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-empty.exception';
import { FeatureFlagPredefinedKeyNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-not-found.exception';
import { FeatureFlagPredefinedKeyTypeInvalidException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-type-invalid.exception';
import { FeatureFlagServiceUnavailableException } from '@modules/feature-flag/exceptions/feature-flag.service-unavailable.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Test, type TestingModule } from '@nestjs/testing';

describe('FeatureFlagDomain', () => {
    const featureFlagRepository = {
        findOneById: vi.fn<FeatureFlagRepository['findOneById']>(),
        updateStatus: vi.fn<FeatureFlagRepository['updateStatus']>(),
        addTargetUser: vi.fn<FeatureFlagRepository['addTargetUser']>(),
        removeTargetUser: vi.fn<FeatureFlagRepository['removeTargetUser']>(),
    } satisfies Pick<
        FeatureFlagRepository,
        'findOneById' | 'updateStatus' | 'addTargetUser' | 'removeTargetUser'
    >;
    const featureFlagCacheService = {
        getByKeyAndCache: vi.fn<FeatureFlagCache['getByKeyAndCache']>(),
        deleteCacheByKey: vi.fn<FeatureFlagCache['deleteCacheByKey']>(),
    } satisfies Pick<FeatureFlagCache, 'getByKeyAndCache' | 'deleteCacheByKey'>;
    const featureFlagUtil = {
        checkMetadataKey: vi.fn<FeatureFlagUtil['checkMetadataKey']>(),
    } satisfies Pick<FeatureFlagUtil, 'checkMetadataKey'>;
    const helperHashService = {
        md5Hash: vi.fn<HelperHashService['md5Hash']>(),
    } satisfies Pick<HelperHashService, 'md5Hash'>;

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
        vi.resetAllMocks();
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
                    useValue: featureFlagCacheService,
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
            expect(
                featureFlagCacheService.getByKeyAndCache
            ).not.toHaveBeenCalled();
        });

        it('rejects an unknown or disabled flag without failing open', async () => {
            featureFlagCacheService.getByKeyAndCache
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
            featureFlagCacheService.getByKeyAndCache.mockResolvedValue({
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
            expect(helperHashService.md5Hash).not.toHaveBeenCalled();
        });

        it('uses a flag-salted deterministic bucket for an untargeted user', async () => {
            featureFlagCacheService.getByKeyAndCache.mockResolvedValue(
                featureFlag
            );
            helperHashService.md5Hash.mockReturnValue('00000031ffff');

            await expect(
                service.validateFeatureFlag('new-home', 'user-id', null)
            ).resolves.toBeUndefined();
            expect(helperHashService.md5Hash).toHaveBeenCalledWith(
                'new-home:user-id'
            );
        });

        it('rejects an anonymous caller below full rollout without a usable id', async () => {
            featureFlagCacheService.getByKeyAndCache.mockResolvedValue(
                featureFlag
            );

            await expect(
                service.validateFeatureFlag('new-home', null, null)
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
        });
    });

    describe('validateFeatureFlagMetadata', () => {
        it('accepts only a true boolean metadata gate', async () => {
            featureFlagCacheService.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                metadata: { allowed: true },
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).resolves.toBeUndefined();
        });

        it('rejects a non-boolean metadata gate', async () => {
            featureFlagCacheService.getByKeyAndCache.mockResolvedValue({
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
            featureFlagCacheService.getByKeyAndCache.mockResolvedValue({
                ...featureFlag,
                metadata: { allowed: false },
            });

            await expect(
                service.validateFeatureFlagMetadata('new-home', 'allowed')
            ).rejects.toBeInstanceOf(FeatureFlagServiceUnavailableException);
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
        expect(featureFlagCacheService.deleteCacheByKey).toHaveBeenCalledWith(
            'new-home'
        );
    });

    it('adds a target user and invalidates the flag cache', async () => {
        featureFlagRepository.findOneById.mockResolvedValue(featureFlag);
        featureFlagRepository.addTargetUser.mockResolvedValue({
            id: 'target-user-id',
            featureFlagId: 'flag-id',
            userId: 'user-id',
        });

        await expect(
            service.addTargetUserByAdmin('flag-id', { userId: 'user-id' })
        ).resolves.toBe(featureFlag);
        expect(featureFlagRepository.addTargetUser).toHaveBeenCalledWith(
            'flag-id',
            'user-id'
        );
        expect(featureFlagCacheService.deleteCacheByKey).toHaveBeenCalledWith(
            'new-home'
        );
    });

    it('removes a target user and invalidates the flag cache', async () => {
        featureFlagRepository.findOneById.mockResolvedValue(featureFlag);
        featureFlagRepository.removeTargetUser.mockResolvedValue({ count: 1 });

        await expect(
            service.removeTargetUserByAdmin('flag-id', 'user-id')
        ).resolves.toBe(featureFlag);
        expect(featureFlagRepository.removeTargetUser).toHaveBeenCalledWith(
            'flag-id',
            'user-id'
        );
    });

    it('throws FeatureFlagNotFoundException before a target mutation', async () => {
        featureFlagRepository.findOneById.mockResolvedValue(null);

        await expect(
            service.addTargetUserByAdmin('missing', { userId: 'user-id' })
        ).rejects.toBeInstanceOf(FeatureFlagNotFoundException);
        expect(featureFlagRepository.addTargetUser).not.toHaveBeenCalled();
        expect(featureFlagCacheService.deleteCacheByKey).not.toHaveBeenCalled();
    });
});
