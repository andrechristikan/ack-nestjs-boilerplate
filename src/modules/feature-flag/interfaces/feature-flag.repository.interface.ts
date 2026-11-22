import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IFeatureFlag,
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';

export interface IFeatureFlagRepository {
    findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IFeatureFlag>>;
    findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IFeatureFlag>>;
    findOneByKey(key: string): Promise<IFeatureFlag | null>;
    findOneById(id: string): Promise<IFeatureFlag | null>;
    updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { isEnable, rolloutPercent, targetUserIds }: IFeatureFlagUpdateStatus
    ): Promise<IFeatureFlag | null>;
    updateMetadataInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { metadata }: IFeatureFlagUpdateMetadata
    ): Promise<IFeatureFlag>;
}
