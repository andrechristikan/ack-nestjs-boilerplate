import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import type { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { IFeatureFlagRepository } from '@modules/feature-flag/interfaces/feature-flag.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';

@Injectable()
export class FeatureFlagRepository implements IFeatureFlagRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.paginationService.offset<
            FeatureFlag,
            Prisma.FeatureFlagWhereInput
        >(this.databaseService.client.featureFlag, pagination);
    }

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        return this.paginationService.cursor<
            FeatureFlag,
            Prisma.FeatureFlagWhereInput
        >(this.databaseService.client.featureFlag, pagination);
    }

    async findOneByKey(
        key: string
    ): Promise<IFeatureFlagWithTargetUsers | null> {
        return this.databaseService.client.featureFlag.findUnique({
            where: {
                key,
            },
            include: {
                targetUsers: true,
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

    async updateStatus(
        id: string,
        { isEnable, rolloutPercent }: FeatureFlagUpdateStatusRequestDto
    ): Promise<FeatureFlag> {
        return this.databaseService.client.featureFlag.update({
            where: {
                id,
            },
            data: {
                isEnable,
                rolloutPercent,
            },
        });
    }

    async updateMetadata(
        id: string,
        { metadata }: FeatureFlagUpdateMetadataRequestDto
    ): Promise<FeatureFlag> {
        return this.databaseService.client.featureFlag.update({
            where: {
                id,
            },
            data: {
                metadata,
            },
        });
    }
}
