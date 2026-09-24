import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';

export interface IFeatureFlagRepository {
    findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePaginationReturn<FeatureFlag>>;
    findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePaginationReturn<FeatureFlag>>;
    findOneByKey(key: string): Promise<IFeatureFlagWithTargetUsers | null>;
    findOneById(id: string): Promise<FeatureFlag | null>;
    updateStatus(
        id: string,
        { isEnable, rolloutPercent }: FeatureFlagUpdateStatusRequestDto
    ): Promise<FeatureFlag>;
    updateMetadata(
        id: string,
        { metadata }: FeatureFlagUpdateMetadataRequestDto
    ): Promise<FeatureFlag>;
}
