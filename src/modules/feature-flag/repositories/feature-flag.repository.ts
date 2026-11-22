import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlagWithTargetsInclude } from '@modules/feature-flag/constants/feature-flag.constant';
import type {
    IFeatureFlag,
    IFeatureFlagUpdateMetadata,
    IFeatureFlagUpdateStatus,
    IFeatureFlagWithTargets,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { IFeatureFlagRepository } from '@modules/feature-flag/interfaces/feature-flag.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagRepository implements IFeatureFlagRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    private toFeatureFlag({
        targets,
        ...featureFlag
    }: IFeatureFlagWithTargets): IFeatureFlag {
        return {
            ...featureFlag,
            targetUserIds: targets.map(target => target.userId),
        };
    }

    async findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IFeatureFlag>> {
        const page = await this.paginationService.offset(
            this.databaseService.client.featureFlag,
            { ...pagination, include: FeatureFlagWithTargetsInclude }
        );

        return { ...page, data: page.data.map(row => this.toFeatureFlag(row)) };
    }

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IFeatureFlag>> {
        const page = await this.paginationService.cursor(
            this.databaseService.client.featureFlag,
            { ...pagination, include: FeatureFlagWithTargetsInclude }
        );

        return { ...page, data: page.data.map(row => this.toFeatureFlag(row)) };
    }

    async findOneByKey(key: string): Promise<IFeatureFlag | null> {
        const featureFlag =
            await this.databaseService.client.featureFlag.findUnique({
                where: {
                    key,
                },
                include: FeatureFlagWithTargetsInclude,
            });

        if (featureFlag === null) {
            return null;
        }

        return this.toFeatureFlag(featureFlag);
    }

    async findOneById(id: string): Promise<IFeatureFlag | null> {
        const featureFlag =
            await this.databaseService.client.featureFlag.findFirst({
                where: {
                    id,
                },
                include: FeatureFlagWithTargetsInclude,
            });

        if (featureFlag === null) {
            return null;
        }

        return this.toFeatureFlag(featureFlag);
    }

    async updateStatusInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { isEnable, rolloutPercent, targetUserIds }: IFeatureFlagUpdateStatus
    ): Promise<IFeatureFlag | null> {
        const { count } = await tx.featureFlag.updateMany({
            where: {
                id,
            },
            data: {
                isEnable,
                rolloutPercent,
            },
        });
        if (count === 0) {
            return null;
        }

        await tx.featureFlagTarget.deleteMany({
            where: {
                featureFlagId: id,
            },
        });
        if (targetUserIds.length > 0) {
            await tx.featureFlagTarget.createMany({
                data: targetUserIds.map(userId => ({
                    featureFlagId: id,
                    userId,
                })),
            });
        }

        const featureFlag = await tx.featureFlag.findFirst({
            where: {
                id,
            },
            include: FeatureFlagWithTargetsInclude,
        });

        if (featureFlag === null) {
            return null;
        }

        return this.toFeatureFlag(featureFlag);
    }

    async updateMetadataInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { metadata }: IFeatureFlagUpdateMetadata
    ): Promise<IFeatureFlag> {
        const featureFlag = await tx.featureFlag.update({
            where: {
                id,
            },
            data: {
                metadata,
            },
            include: FeatureFlagWithTargetsInclude,
        });

        return this.toFeatureFlag(featureFlag);
    }
}
