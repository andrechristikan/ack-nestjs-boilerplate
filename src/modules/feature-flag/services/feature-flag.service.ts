import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { FeatureFlagPredefinedKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-empty.exception';
import { FeatureFlagPredefinedKeyLengthExceededException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-length-exceeded.exception';
import { FeatureFlagPredefinedKeyNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-not-found.exception';
import { FeatureFlagPredefinedKeyTypeInvalidException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-type-invalid.exception';
import { FeatureFlagServiceUnavailableException } from '@modules/feature-flag/exceptions/feature-flag.service-unavailable.exception';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { IFeatureFlagService } from '@modules/feature-flag/interfaces/feature-flag.service.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagService implements IFeatureFlagService {
    private readonly anonymousHeaderName: string;
    private readonly anonymousIdMaxLength: number;
    private readonly anonymousIdPattern: RegExp;

    constructor(
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly featureFlagUtil: FeatureFlagUtil,
        private readonly configService: ConfigService
    ) {
        this.anonymousHeaderName = this.configService.get<string>(
            'featureFlag.anonymous.headerName'
        )!;
        this.anonymousIdMaxLength = this.configService.get<number>(
            'featureFlag.anonymous.idMaxLength'
        )!;
        this.anonymousIdPattern = this.configService.get<RegExp>(
            'featureFlag.anonymous.idPattern'
        )!;
    }

    private resolveAnonymousId(request: IRequestApp): string | null {
        const anonymousId = request.headers[this.anonymousHeaderName];
        if (
            typeof anonymousId !== 'string' ||
            anonymousId.length === 0 ||
            anonymousId.length > this.anonymousIdMaxLength ||
            !this.anonymousIdPattern.test(anonymousId)
        ) {
            return null;
        }

        return anonymousId;
    }

    private assertRollout(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): void {
        const checkRollout = this.featureFlagUtil.checkRolloutPercentage(
            rolloutPercent,
            key,
            identifier
        );
        if (!checkRollout) {
            throw new FeatureFlagServiceUnavailableException();
        }
    }

    async validateFeatureFlagGuard(
        request: IRequestApp,
        keyPath: string
    ): Promise<void> {
        const keys = keyPath.split('.');
        if (keys.some(segment => segment.length === 0)) {
            throw new FeatureFlagPredefinedKeyEmptyException();
        } else if (keys.length > 1) {
            throw new FeatureFlagPredefinedKeyLengthExceededException();
        }

        const key = keys[0];
        const featureFlag = await this.featureFlagUtil.getByKeyAndCache(key);
        if (!featureFlag) {
            throw new FeatureFlagPredefinedKeyNotFoundException();
        } else if (!featureFlag.isEnable) {
            throw new FeatureFlagServiceUnavailableException();
        }

        const { user } = request;
        if (user) {
            if (featureFlag.targetUserIds.includes(user.userId)) {
                return;
            }

            this.assertRollout(featureFlag.rolloutPercent, key, user.userId);

            return;
        }

        if (featureFlag.rolloutPercent >= 100) {
            return;
        }

        const anonymousId = this.resolveAnonymousId(request);
        if (!anonymousId) {
            throw new FeatureFlagServiceUnavailableException();
        }

        this.assertRollout(featureFlag.rolloutPercent, key, anonymousId);
    }

    async validateFeatureFlagMetadata(
        key: string,
        metadataKey: string
    ): Promise<void> {
        const featureFlag = await this.featureFlagUtil.getByKeyAndCache(key);
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
        pagination: IPaginationQueryOffsetParams<
            Prisma.FeatureFlagSelect,
            Prisma.FeatureFlagWhereInput
        >
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        const { data, ...others } =
            await this.featureFlagRepository.findWithPaginationOffsetByAdmin(
                pagination
            );

        const featureFlags: FeatureFlagResponseDto[] =
            this.featureFlagUtil.mapList(data);
        return {
            data: featureFlags,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<
            Prisma.FeatureFlagSelect,
            Prisma.FeatureFlagWhereInput
        >
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        const { data, ...others } =
            await this.featureFlagRepository.findWithPaginationCursor(
                pagination
            );

        const featureFlags: FeatureFlagResponseDto[] =
            this.featureFlagUtil.mapList(data);
        return {
            data: featureFlags,
            ...others,
        };
    }

    async updateStatusByAdmin(
        id: string,
        data: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new FeatureFlagNotFoundException();
        }

        const [updated] = await Promise.all([
            this.featureFlagRepository.updateStatus(id, data),
            this.featureFlagUtil.deleteCacheByKey(featureFlag.key),
        ]);

        const mapped: FeatureFlagResponseDto =
            this.featureFlagUtil.mapOne(updated);

        return {
            data: mapped,
        };
    }

    async updateMetadataByAdmin(
        id: string,
        data: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
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
            this.featureFlagUtil.deleteCacheByKey(featureFlag.key),
        ]);

        const mapped: FeatureFlagResponseDto =
            this.featureFlagUtil.mapOne(updated);

        return {
            data: mapped,
        };
    }
}
