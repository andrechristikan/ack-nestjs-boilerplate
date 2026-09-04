import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagResponseDto } from '@modules/feature-flag/dtos/response/feature-flag.response.dto';
import { IFeatureFlagHttpService } from '@modules/feature-flag/interfaces/feature-flag.http.service.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagHttpService implements IFeatureFlagHttpService {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly featureFlagUtil: FeatureFlagUtil
    ) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        const { data, ...others } =
            await this.featureFlagService.getListByAdmin(pagination);
        const featureFlags: FeatureFlagResponseDto[] =
            this.featureFlagUtil.mapList(data);

        return {
            data: featureFlags,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlagResponseDto>> {
        const { data, ...others } =
            await this.featureFlagService.getListCursor(pagination);
        const featureFlags: FeatureFlagResponseDto[] =
            this.featureFlagUtil.mapList(data);

        return {
            data: featureFlags,
            ...others,
        };
    }

    async updateStatusByAdmin(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        const updated = await this.featureFlagService.updateStatusByAdmin(
            id,
            body
        );

        return {
            data: this.featureFlagUtil.mapOne(updated),
        };
    }

    async updateMetadataByAdmin(
        id: string,
        body: FeatureFlagUpdateMetadataRequestDto
    ): Promise<IResponseReturn<FeatureFlagResponseDto>> {
        const updated = await this.featureFlagService.updateMetadataByAdmin(
            id,
            body
        );

        return {
            data: this.featureFlagUtil.mapOne(updated),
        };
    }
}
