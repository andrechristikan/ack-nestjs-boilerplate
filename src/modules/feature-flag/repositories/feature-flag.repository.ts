import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { Injectable } from '@nestjs/common';
import { FeatureFlag, FeatureFlagUser, Prisma } from '@generated/prisma-client';

@Injectable()
export class FeatureFlagRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        return this.paginationService.offset<
            FeatureFlag,
            Prisma.FeatureFlagWhereInput
        >(this.databaseService.client.featureFlag, pagination);
    }

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
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
            include: { targetUsers: true },
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

    async addTargetUser(
        featureFlagId: string,
        userId: string
    ): Promise<FeatureFlagUser> {
        return this.databaseService.client.featureFlagUser.upsert({
            where: {
                featureFlagId_userId: {
                    featureFlagId,
                    userId,
                },
            },
            create: {
                featureFlagId,
                userId,
            },
            update: {},
        });
    }

    async removeTargetUser(
        featureFlagId: string,
        userId: string
    ): Promise<Prisma.BatchPayload> {
        return this.databaseService.client.featureFlagUser.deleteMany({
            where: {
                featureFlagId,
                userId,
            },
        });
    }
}
