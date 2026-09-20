import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagHttpService {
    constructor(private readonly featureFlagDomain: FeatureFlagDomain) {}

    async getListByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        const { data, ...others } =
            await this.featureFlagDomain.getListByAdmin(pagination);

        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.FeatureFlagWhereInput>
    ): Promise<IResponsePagingReturn<FeatureFlag>> {
        const { data, ...others } =
            await this.featureFlagDomain.getListCursor(pagination);

        return {
            data,
            ...others,
        };
    }

    async updateStatusByAdmin(
        id: string,
        body: FeatureFlagUpdateStatusRequestDto
    ): Promise<IResponseReturn<FeatureFlag>> {
        const updated = await this.featureFlagDomain.updateStatusByAdmin(
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
        const updated = await this.featureFlagDomain.updateMetadataByAdmin(
            id,
            body
        );

        return {
            data: updated,
        };
    }
}
