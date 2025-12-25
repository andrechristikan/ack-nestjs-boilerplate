import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { IFeatureFlagService } from '@modules/feature-flag/interfaces/feature-flag.service.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { FeatureFlag } from '@prisma/client';

@Injectable()
export class FeatureFlagService implements IFeatureFlagService {
    constructor(
        private readonly featureFlagRepository: FeatureFlagRepository,
        private readonly featureFlagUtil: FeatureFlagUtil
    ) {}

    async validateFeatureFlagGuard(
        request: IRequestApp,
        keyPath: string
    ): Promise<void> {
        const keys = keyPath.split('.');
        if (keys.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumFeatureFlagStatusCodeError.predefinedKeyEmpty,
                message: 'featureFlag.error.predefinedKeyEmpty',
            });
        } else if (keys.length > 2) {
            throw new InternalServerErrorException({
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyLengthExceeded,
                message: 'featureFlag.error.predefinedKeyLengthExceeded',
            });
        }

        const featureFlag = await this.findOneByKeyAndCache(keys[0]);
        if (!featureFlag || !featureFlag.isEnable) {
            throw new ServiceUnavailableException({
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                message: 'featureFlag.error.serviceUnavailable',
            });
        } else if (keys.length > 1) {
            const metadata: boolean | number | string | null =
                featureFlag.metadata[keys[1]];
            if (typeof metadata !== 'boolean') {
                throw new InternalServerErrorException({
                    statusCode:
                        EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid,
                    message: 'featureFlag.error.predefinedKeyTypeInvalid',
                });
            } else if (!metadata) {
                throw new ServiceUnavailableException({
                    statusCode:
                        EnumFeatureFlagStatusCodeError.serviceUnavailable,
                    message: 'featureFlag.error.serviceUnavailable',
                });
            }
        }

        const { user } = request;
        if (user) {
            const checkRollout = this.featureFlagUtil.checkRolloutPercentage(
                featureFlag.rolloutPercent,
                user.userId
            );
            if (!checkRollout) {
                throw new ServiceUnavailableException({
                    statusCode:
                        EnumFeatureFlagStatusCodeError.serviceUnavailable,
                    message: 'featureFlag.error.serviceUnavailable',
                });
            }
        }
    }

    async findOneByKeyAndCache(key: string): Promise<FeatureFlag | null> {
        const cached = await this.featureFlagUtil.getCacheByKey(key);
        if (cached) {
            return cached;
        }

        const apiKey = await this.featureFlagRepository.findOneByKey(key);
        if (apiKey) {
            await this.featureFlagUtil.setCacheByKey(key, apiKey);
        }

        return apiKey;
    }

    async findOneMetadataByKeyAndCache<T>(key: string): Promise<T | null> {
        const cached = await this.findOneByKeyAndCache(key);
        if (cached && cached.metadata) {
            return cached.metadata as T;
        }

        return null;
    }

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams
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
        pagination: IPaginationQueryCursorParams
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
            throw new NotFoundException({
                statusCode: EnumFeatureFlagStatusCodeError.notFound,
                message: 'featureFlag.error.notFound',
            });
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
            throw new NotFoundException({
                statusCode: EnumFeatureFlagStatusCodeError.notFound,
                message: 'featureFlag.error.notFound',
            });
        }

        const validated = this.featureFlagUtil.checkMetadataKey(
            featureFlag.metadata as IFeatureFlagMetadata,
            data.metadata
        );
        if (!validated) {
            throw new BadRequestException({
                statusCode: EnumFeatureFlagStatusCodeError.invalidMetadata,
                message: 'featureFlag.error.invalidMetadata',
            });
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
