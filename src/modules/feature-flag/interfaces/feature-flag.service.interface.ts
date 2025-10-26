import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request';
import { FeatureFlagUpdateRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update.request';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response';
import { FeatureFlag } from '@prisma/client';

export interface IFeatureFlagService {
    validateFeatureFlagGuard(key: string): Promise<void>;
    findOneByKeyAndCache(key: string): Promise<FeatureFlag | null>;
    getList(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>>;
    updateStatus(
        id: string,
        data: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>>;
    update(
        id: string,
        data: FeatureFlagUpdateRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>>;
}
