import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request';
import { Injectable } from '@nestjs/common';
import { FeatureFlag } from '@prisma/client';

@Injectable()
export class FeatureFlagRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.paginationService.offset<FeatureFlag>(
            this.databaseService.featureFlag,
            pagination
        );
    }

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.paginationService.cursor<FeatureFlag>(
            this.databaseService.featureFlag,
            pagination
        );
    }

    async findOneByKey(key: string): Promise<FeatureFlag | null> {
        return this.databaseService.featureFlag.findUnique({
            where: {
                key,
            },
        });
    }

    async findOneById(id: string): Promise<FeatureFlag | null> {
        return this.databaseService.featureFlag.findFirst({
            where: {
                id,
            },
        });
    }

    async updateStatus(
        id: string,
        { isEnable, rolloutPercent }: FeatureFlagUpdateStatusRequestDto
    ): Promise<FeatureFlag> {
        return this.databaseService.featureFlag.update({
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
        return this.databaseService.featureFlag.update({
            where: {
                id,
            },
            data: {
                metadata,
            },
        });
    }
}
