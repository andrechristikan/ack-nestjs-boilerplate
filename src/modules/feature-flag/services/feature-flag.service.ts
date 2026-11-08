import { HelperHashService } from '@common/helper/services/helper.hash.service';
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
    IFeatureFlagMetadataValue,
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import type {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagService {
    constructor(
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly featureFlagCache: FeatureFlagCache,
        private readonly helperHashService: HelperHashService
    ) {}

    private metadataValueType(value: IFeatureFlagMetadataValue): string {
        if (Array.isArray(value)) {
            return value.length > 0 ? `array:${typeof value[0]}` : 'array';
        }

        return typeof value;
    }

    private isMetadataValid(
        oldMetadata: IFeatureFlagMetadata | null,
        newMetadata: IFeatureFlagMetadata
    ): boolean {
        if (oldMetadata === null) {
            return false;
        }

        const oldKeys = Object.keys(oldMetadata).sort();
        const newKeys = Object.keys(newMetadata).sort();

        const isValidStructure =
            JSON.stringify(oldKeys) === JSON.stringify(newKeys);
        if (!isValidStructure) {
            return false;
        }

        for (const key of newKeys) {
            const newVal = newMetadata[key]!;
            const oldVal = oldMetadata[key]!;

            const newValueType = this.metadataValueType(newVal);
            const oldValueType = this.metadataValueType(oldVal);
            if (newValueType !== oldValueType) {
                return false;
            } else if (
                (newVal ?? null) === null ||
                newVal === '' ||
                (Array.isArray(newVal) && newVal.length === 0)
            ) {
                return false;
            }
        }

        return true;
    }

    private isInRollout(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): boolean {
        const hash = this.helperHashService.sha256Hash(`${key}:${identifier}`);
        const num = Number.parseInt(hash.slice(0, 8), 16);
        const percentage = num % 100;

        return percentage < rolloutPercent;
    }

    private assertRollout(
        rolloutPercent: number,
        key: EnumFeatureFlagKey,
        identifier: string
    ): void {
        const isInRollout = this.isInRollout(rolloutPercent, key, identifier);
        if (!isInRollout) {
            throw new FeatureFlagDisabledException();
        }
    }

    /** Read-through: the cached flag, else the database row, cached only while this reader holds the lease; null when no row exists. */
    async getByKey(key: EnumFeatureFlagKey): Promise<FeatureFlag | null> {
        const cached = await this.featureFlagCache.getFeatureFlag(key);
        if (cached) {
            return cached;
        }

        // Sequential by design: side effects whose order is part of the contract (the lease is taken before the read it guards)
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

    async getMetadataByKey<T>(key: EnumFeatureFlagKey): Promise<T | null> {
        const featureFlag = await this.getByKey(key);
        if (featureFlag && featureFlag.metadata) {
            return featureFlag.metadata as T;
        }

        return null;
    }

    async validateFeatureFlag(
        key: EnumFeatureFlagKey,
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
        key: EnumFeatureFlagKey,
        metadataKey: EnumFeatureFlagMetadataKey
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
        const updated = await this.featureFlagRepository.updateStatus(id, data);
        if (!updated) {
            throw new FeatureFlagNotFoundException();
        }

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

        const validated = this.isMetadataValid(
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
