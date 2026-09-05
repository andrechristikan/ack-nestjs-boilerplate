import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { FeatureFlag, Prisma } from '@generated/prisma-client';
import { FeatureFlagTargetUserRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.target-user.request';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { IFeatureFlagHttpService } from '@modules/feature-flag/interfaces/feature-flag.http.service.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagHttpService implements IFeatureFlagHttpService {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        const { data, ...others } =
            await this.featureFlagService.getListByAdmin(pagination);

        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        const { data, ...others } =
            await this.featureFlagService.getListCursor(pagination);

        return {
            data,
            ...others,
        };
    }

    async updateStatusByAdmin(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.updateStatusByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }

    async updateMetadataByAdmin(
        id: string,
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.updateMetadataByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }

    async addTargetUserByAdmin(
        id: string,
        body: FeatureFlagTargetUserRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.addTargetUserByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }

    async removeTargetUserByAdmin(
        id: string,
        userId: string
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagService.removeTargetUserByAdmin(
            id,
            userId
        );

        return {
            data: updated,
        };
    }
}
