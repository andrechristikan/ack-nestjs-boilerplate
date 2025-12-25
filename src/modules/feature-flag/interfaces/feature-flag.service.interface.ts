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
import { FeatureFlag } from '@prisma/client';

export interface IFeatureFlagService {
    validateFeatureFlagGuard(request: IRequestApp, key: string): Promise<void>;
    findOneByKeyAndCache(key: string): Promise<FeatureFlag | null>;
    findOneMetadataByKeyAndCache<T>(key: string): Promise<T | null>;
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>>;
    getListCursor(
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>>;
    updateStatusByAdmin(
        id: string,
        data: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>>;
    updateMetadataByAdmin(
        id: string,
        data: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>>;
}
