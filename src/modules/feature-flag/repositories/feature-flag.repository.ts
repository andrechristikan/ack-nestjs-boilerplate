import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlagWithTargetsInclude } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
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
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
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
    ): Promise<IFeatureFlag> {
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

        // Sequential by design: a statement whose failure is the answer, awaited alone after the target writes it rolls back
        try {
            const featureFlag = await tx.featureFlag.update({
                where: {
                    id,
                },
                data: {
                    isEnable,
                    rolloutPercent,
                },
                include: FeatureFlagWithTargetsInclude,
            });

            return this.toFeatureFlag(featureFlag);
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new FeatureFlagNotFoundException()
            );
        }
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
