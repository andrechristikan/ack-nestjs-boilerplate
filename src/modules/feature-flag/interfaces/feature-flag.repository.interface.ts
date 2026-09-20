import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';

export interface IFeatureFlagRepository {
    findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>>;
    findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>>;
    findOneByKey(key: string): Promise<IFeatureFlagWithTargetUsers | null>;
    findOneById(id: string): Promise<FeatureFlag | null>;
    updateStatus(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<FeatureFlag>;
    updateMetadata(
        id: string,
        { metadata }: FeatureFlagUpdateMetadataRequestDto
    ): Promise<FeatureFlag>;
}
