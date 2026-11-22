import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { IFeatureFlagRepository } from '@modules/feature-flag/interfaces/feature-flag.repository.interface';
import { Injectable } from '@nestjs/common';
import type { FeatureFlag } from '@generated/prisma-client/client';

@Injectable()
export class FeatureFlagRepository implements IFeatureFlagRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.paginationService.offset(
            this.databaseService.client.featureFlag,
            pagination
        );
    }

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.paginationService.cursor(
            this.databaseService.client.featureFlag,
            pagination
        );
    }

    async findOneByKey(key: string): Promise<FeatureFlag | null> {
        return this.databaseService.client.featureFlag.findUnique({
            where: {
                key,
            },
        });
    }

    async findOneById(id: string): Promise<FeatureFlag | null> {
        return this.databaseService.client.featureFlag.findFirst({
            where: {
                id,
            },
        });
    }

    async updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { isEnable, rolloutPercent, targetUserIds }: IFeatureFlagUpdateStatus
    ): Promise<FeatureFlag | null> {
        const { count } = await tx.featureFlag.updateMany({
            where: {
                id,
            },
            data: {
                isEnable,
                rolloutPercent,
                targetUserIds,
            },
        });
        if (count === 0) {
            return null;
        }

        return tx.featureFlag.findFirst({
            where: {
                id,
            },
        });
    }

    async updateMetadataInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { metadata }: IFeatureFlagUpdateMetadata
    ): Promise<FeatureFlag> {
        return tx.featureFlag.update({
            where: {
                id,
            },
            data: {
                metadata,
            },
        });
    }
}
