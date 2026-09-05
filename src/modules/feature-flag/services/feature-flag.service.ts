import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlag, Prisma } from '@generated/prisma-client';
import { FeatureFlagTargetUserRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { FeatureFlagPredefinedKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-empty.exception';
import { FeatureFlagPredefinedKeyLengthExceededException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-length-exceeded.exception';
import { FeatureFlagPredefinedKeyNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-not-found.exception';
import { FeatureFlagPredefinedKeyTypeInvalidException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-type-invalid.exception';
import { FeatureFlagServiceUnavailableException } from '@modules/feature-flag/exceptions/feature-flag.service-unavailable.exception';
import {
    IFeatureFlagMetadata,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { IFeatureFlagService } from '@modules/feature-flag/interfaces/feature-flag.service.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagCacheService } from '@modules/feature-flag/services/feature-flag.cache.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagService implements IFeatureFlagService {
    constructor(
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly featureFlagUtil: FeatureFlagUtil,
        private readonly featureFlagCacheService: FeatureFlagCacheService,
        private readonly helperHashService: HelperHashService
    ) {}

    private assertRollout(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): void {
        const checkRollout = this.checkRolloutPercentage(
            rolloutPercent,
            key,
            identifier
        );
        if (!checkRollout) {
            throw new FeatureFlagServiceUnavailableException();
        }
    }

    /** Deterministic bucketing salted by flag key so each flag buckets a user independently. */
    checkRolloutPercentage(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): boolean {
        const hash = this.helperHashService.md5Hash(`${key}:${identifier}`);
        const num = Number.parseInt(hash.slice(0, 8), 16);
        const percentage = num % 100;

        return percentage < rolloutPercent;
    }

    async validateFeatureFlag(
        keyPath: string,
        userId: string | null,
        anonymousId: string | null
    ): Promise<void> {
        const keys = keyPath.split('.');
        if (keys.some(segment => segment.length === 0)) {
            throw new FeatureFlagPredefinedKeyEmptyException();
        } else if (keys.length > 1) {
            throw new FeatureFlagPredefinedKeyLengthExceededException();
        }

        const key = keys[0];
        const featureFlag =
            await this.featureFlagCacheService.getByKeyAndCache(key);
        if (!featureFlag) {
            throw new FeatureFlagPredefinedKeyNotFoundException();
        } else if (!featureFlag.isEnable) {
            throw new FeatureFlagServiceUnavailableException();
        }

        if (userId) {
            const targetUserIds = featureFlag.targetUsers.map(
                targetUser => targetUser.userId
            );
            if (targetUserIds.includes(userId)) {
                return;
            }

            this.assertRollout(featureFlag.rolloutPercent, key, userId);

            return;
        }

        if (featureFlag.rolloutPercent >= 100) {
            return;
        }

        if (!anonymousId) {
            throw new FeatureFlagServiceUnavailableException();
        }

        this.assertRollout(featureFlag.rolloutPercent, key, anonymousId);
    }

    async validateFeatureFlagMetadata(
        key: string,
        metadataKey: string
    ): Promise<void> {
        const featureFlag =
            await this.featureFlagCacheService.getByKeyAndCache(key);
        if (!featureFlag) {
            throw new FeatureFlagPredefinedKeyNotFoundException();
        } else if (!featureFlag.isEnable) {
            throw new FeatureFlagServiceUnavailableException();
        }

        const metadata: unknown =
            (featureFlag.metadata as Record<string, unknown>)?.[metadataKey] ??
            null;
        if (typeof metadata !== 'boolean') {
            throw new FeatureFlagPredefinedKeyTypeInvalidException();
        } else if (!metadata) {
            throw new FeatureFlagServiceUnavailableException();
        }
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.featureFlagRepository.findWithPaginationOffsetByAdmin(
            pagination
        );
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.featureFlagRepository.findWithPaginationCursor(pagination);
    }

    async updateStatusByAdmin(
        id: string,
        data: FeatureFlagUpdateStatusRequestDto
    ): Promise<FeatureFlag> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        const [updated] = await Promise.all([
            this.featureFlagRepository.updateStatus(id, data),
            this.featureFlagCacheService.deleteCacheByKey(featureFlag.key),
        ]);

        return updated;
    }

    async updateMetadataByAdmin(
        id: string,
        data: FeatureFlagUpdateMetadataRequestDto
    ): Promise<FeatureFlag> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        const validated = this.featureFlagUtil.checkMetadataKey(
            featureFlag.metadata as IFeatureFlagMetadata,
            data.metadata
        );
        if (!validated) {
            throw new FeatureFlagInvalidMetadataException();
        }

        const [updated] = await Promise.all([
            this.featureFlagRepository.updateMetadata(id, data),
            this.featureFlagCacheService.deleteCacheByKey(featureFlag.key),
        ]);

        return updated;
    }

    async addTargetUserByAdmin(
        id: string,
        { userId }: FeatureFlagTargetUserRequestDto
    ): Promise<FeatureFlag> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        await Promise.all([
            this.featureFlagRepository.addTargetUser(id, userId),
            this.featureFlagCacheService.deleteCacheByKey(featureFlag.key),
        ]);

        return featureFlag;
    }

    async removeTargetUserByAdmin(
        id: string,
        userId: string
    ): Promise<FeatureFlag> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        await Promise.all([
            this.featureFlagRepository.removeTargetUser(id, userId),
            this.featureFlagCacheService.deleteCacheByKey(featureFlag.key),
        ]);

        return featureFlag;
    }
}
