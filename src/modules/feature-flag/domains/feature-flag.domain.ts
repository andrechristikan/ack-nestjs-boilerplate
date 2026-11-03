import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import type {
    IFeatureFlagMetadata,
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagDomain {
    constructor(
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly featureFlagUtil: FeatureFlagUtil,
        private readonly featureFlagCache: FeatureFlagCache
    ) {}

    private assertRollout(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): void {
        const isInRollout = this.featureFlagUtil.isInRollout(
            rolloutPercent,
            key,
            identifier
        );
        if (!isInRollout) {
            throw new FeatureFlagDisabledException();
        }
    }

    /** Read-through: the cached flag, or the row loaded from the database and cached while this reader holds the lease. */
    async getByKey(key: string): Promise<FeatureFlag | null> {
        const cached = await this.featureFlagCache.getFeatureFlag(key);
        if (cached) {
            return cached;
        }

        // Sequential by design: the lease is taken before the read it guards
        const leaseToken =
            await this.featureFlagCache.takeFeatureFlagLease(key);
        const featureFlag = await this.featureFlagRepository.findOneByKey(key);
        if (featureFlag && leaseToken !== null) {
            await this.featureFlagCache.setFeatureFlag(
                key,
                featureFlag,
                leaseToken
            );
        }

        return featureFlag;
    }

    async getMetadataByKey<T>(key: string): Promise<T | null> {
        const featureFlag = await this.getByKey(key);
        if (featureFlag && featureFlag.metadata) {
            return featureFlag.metadata as T;
        }

        return null;
    }

    async validateFeatureFlag(
        key: string,
        userId: string | null,
        anonymousId: string | null
    ): Promise<void> {
        const featureFlag = await this.getByKey(key);
        if (!featureFlag) {
            throw new FeatureFlagNotConfiguredException(key);
        } else if (!featureFlag.isEnable) {
            throw new FeatureFlagDisabledException();
        }

        if (userId) {
            if (featureFlag.targetUserIds.includes(userId)) {
                return;
            }

            this.assertRollout(featureFlag.rolloutPercent, key, userId);

            return;
        }

        if (featureFlag.rolloutPercent >= 100) {
            return;
        }

        if (!anonymousId) {
            throw new FeatureFlagDisabledException();
        }

        this.assertRollout(featureFlag.rolloutPercent, key, anonymousId);
    }

    async validateFeatureFlagMetadata(
        key: string,
        metadataKey: string
    ): Promise<void> {
        const featureFlag = await this.getByKey(key);
        if (!featureFlag) {
            throw new FeatureFlagNotConfiguredException(key);
        } else if (!featureFlag.isEnable) {
            throw new FeatureFlagDisabledException();
        }

        const metadata: unknown =
            (featureFlag.metadata as Record<string, unknown>)?.[metadataKey] ??
            null;
        if (typeof metadata !== 'boolean') {
            throw new FeatureFlagDisabledException();
        } else if (!metadata) {
            throw new FeatureFlagDisabledException();
        }
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.featureFlagRepository.findWithPaginationOffsetByAdmin(
            pagination
        );
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.featureFlagRepository.findWithPaginationCursor(pagination);
    }

    async updateStatusByAdmin(
        id: string,
        data: IFeatureFlagUpdateStatus
    ): Promise<FeatureFlag> {
        // Sequential by design: gate before the work it guards
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        const updated = await this.featureFlagRepository.updateStatus(id, data);
        await this.featureFlagCache.deleteFeatureFlag(updated.key);

        return updated;
    }

    async updateMetadataByAdmin(
        id: string,
        data: IFeatureFlagUpdateMetadata
    ): Promise<FeatureFlag> {
        // Sequential by design: gate before the work it guards
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        const validated = this.featureFlagUtil.isMetadataValid(
            featureFlag.metadata as IFeatureFlagMetadata | null,
            data.metadata
        );
        if (!validated) {
            throw new FeatureFlagInvalidMetadataException();
        }

        const updated = await this.featureFlagRepository.updateMetadata(
            id,
            data
        );
        await this.featureFlagCache.deleteFeatureFlag(updated.key);

        return updated;
    }
}
