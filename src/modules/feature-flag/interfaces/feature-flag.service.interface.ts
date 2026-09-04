import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlag, Prisma } from '@generated/prisma-client';
import { FeatureFlagTargetUserRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';

export interface IFeatureFlagService {
    checkRolloutPercentage(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): boolean;
    validateFeatureFlag(
        keyPath: string,
        userId: string | null,
        anonymousId: string | null
    ): Promise<void>;
    validateFeatureFlagMetadata(
        key: string,
        metadataKey: string
    ): Promise<void>;
    getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>>;
    getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>>;
    updateStatusByAdmin(
        id: string,
        data: FeatureFlagUpdateStatusRequestDto
    ): Promise<FeatureFlag>;
    updateMetadataByAdmin(
        id: string,
        data: FeatureFlagUpdateMetadataRequestDto
    ): Promise<FeatureFlag>;
    addTargetUserByAdmin(
        id: string,
        data: FeatureFlagTargetUserRequestDto
    ): Promise<FeatureFlag>;
    removeTargetUserByAdmin(id: string, userId: string): Promise<FeatureFlag>;
}
