import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request';
import { FeatureFlagUpdateRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update.request';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { ENUM_FEATURE_FLAG_STATUS_CODE_ERROR } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { IFeatureFlagValue } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { IFeatureFlagService } from '@modules/feature-flag/interfaces/feature-flag.service.interface';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import {
    BadRequestException,
    Injectable,
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

    async validateFeatureFlagGuard(key: string): Promise<void> {
        try {
            const featureFlag = await this.findOneByKeyAndCache(key);
            if (!featureFlag || !featureFlag.isEnable) {
                throw new ServiceUnavailableException({
                    statusCode:
                        ENUM_FEATURE_FLAG_STATUS_CODE_ERROR.SERVICE_UNAVAILABLE,
                    message: 'featureFlag.error.serviceUnavailable',
                });
            }
        } catch {
            throw new ServiceUnavailableException({
                statusCode:
                    ENUM_FEATURE_FLAG_STATUS_CODE_ERROR.SERVICE_UNAVAILABLE,
                message: 'featureFlag.error.serviceUnavailable',
            });
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

    async getList(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        const { data, ...others } =
            await this.featureFlagRepository.findWithPaginationOffsetByUser(
                pagination
            );

        const featureFlags: FeatureFlagResponseDto[] =
            this.featureFlagUtil.mapList(data);
        return {
            data: featureFlags,
            ...others,
        };
    }

    async updateStatus(
        id: string,
        data: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new NotFoundException({
                statusCode: ENUM_FEATURE_FLAG_STATUS_CODE_ERROR.NOT_FOUND,
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

    async update(
        id: string,
        data: FeatureFlagUpdateRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        const featureFlag = await this.featureFlagRepository.findOneById(id);
        if (!featureFlag) {
            throw new NotFoundException({
                statusCode: ENUM_FEATURE_FLAG_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'featureFlag.error.notFound',
            });
        }

        const validated = this.featureFlagUtil.checkValueKey(
            featureFlag.value as IFeatureFlagValue,
            data.value
        );
        if (!validated) {
            throw new BadRequestException({
                statusCode: ENUM_FEATURE_FLAG_STATUS_CODE_ERROR.INVALID_VALUE,
                message: 'featureFlag.error.invalidValue',
            });
        }

        const [updated] = await Promise.all([
            this.featureFlagRepository.update(id, data),
            this.featureFlagUtil.deleteCacheByKey(featureFlag.key),
        ]);

        const mapped: FeatureFlagResponseDto =
            this.featureFlagUtil.mapOne(updated);

        return {
            data: mapped,
        };
    }
}
