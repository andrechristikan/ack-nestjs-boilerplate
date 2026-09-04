import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlag, Prisma } from '@generated/prisma-client';
import {
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';

export interface IFeatureFlagService {
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
        data: IFeatureFlagUpdateStatus
    ): Promise<FeatureFlag>;
    updateMetadataByAdmin(
        id: string,
        data: IFeatureFlagUpdateMetadata
    ): Promise<FeatureFlag>;
}
