import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IFeatureFlag,
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { IFeatureFlagRepository } from '@modules/feature-flag/interfaces/feature-flag.repository.interface';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma-client/client';
import { FeatureFlagInclude } from '@modules/feature-flag/constants/feature-flag.constant';

@Injectable()
export class FeatureFlagRepository implements IFeatureFlagRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    private toFeatureFlag({
        targetUsers,
        ...flag
    }: Prisma.FeatureFlagGetPayload<{
        include: typeof FeatureFlagInclude;
    }>): IFeatureFlag {
        return { ...flag, targetUserIds: targetUsers.map(user => user.userId) };
    }

    async findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IFeatureFlag>> {
        const result = await this.paginationService.offset(
            this.databaseService.client.featureFlag,
            { ...pagination, include: FeatureFlagInclude }
        );

        const data = result.data.map(row => this.toFeatureFlag(row));

        return { ...result, data };
    }

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IFeatureFlag>> {
        const result = await this.paginationService.cursor(
            this.databaseService.client.featureFlag,
            { ...pagination, include: FeatureFlagInclude }
        );

        const data = result.data.map(row => this.toFeatureFlag(row));

        return { ...result, data };
    }

    async findOneByKey(key: string): Promise<IFeatureFlag | null> {
        const row = await this.databaseService.client.featureFlag.findUnique({
            where: { key },
            include: FeatureFlagInclude,
        });

        if (row === null) {
            return null;
        }
        const flag = this.toFeatureFlag(row);

        return flag;
    }

    async findOneById(id: string): Promise<IFeatureFlag | null> {
        const row = await this.databaseService.client.featureFlag.findFirst({
            where: { id },
            include: FeatureFlagInclude,
        });

        if (row === null) {
            return null;
        }
        const flag = this.toFeatureFlag(row);

        return flag;
    }

    async updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { isEnable, rolloutPercent, targetUserIds }: IFeatureFlagUpdateStatus
    ): Promise<IFeatureFlag | null> {
        const { count } = await tx.featureFlag.updateMany({
            where: { id },
            data: { isEnable, rolloutPercent },
        });
        if (count === 0) {
            return null;
        }

        await tx.featureFlagUser.deleteMany({ where: { featureFlagId: id } });
        await tx.featureFlagUser.createMany({
            data: targetUserIds.map(userId => ({ featureFlagId: id, userId })),
        });

        const row = await tx.featureFlag.findFirst({
            where: { id },
            include: FeatureFlagInclude,
        });

        if (row === null) {
            return null;
        }
        const flag = this.toFeatureFlag(row);

        return flag;
    }

    async updateMetadataInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { metadata }: IFeatureFlagUpdateMetadata
    ): Promise<IFeatureFlag> {
        const row = await tx.featureFlag.update({
            where: { id },
            data: { metadata },
            include: FeatureFlagInclude,
        });

        const flag = this.toFeatureFlag(row);

        return flag;
    }
}
