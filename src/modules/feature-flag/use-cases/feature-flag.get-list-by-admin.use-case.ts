import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { FeatureFlag } from '@generated/prisma-client/client';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import type { FeatureFlagAdminListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class FeatureFlagGetListByAdminUseCase implements IAppUseCase<
    [FeatureFlagAdminListRequestDto],
    IResponsePaginationReturn<FeatureFlag>
> {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: FeatureFlagAdminListRequestDto
    ): Promise<IResponsePaginationReturn<FeatureFlag>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.FeatureFlagWhereInput>(
                query,
                {
                    availableSearch: FeatureFlagDefaultAvailableSearch,
                    availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.featureFlagService.getListByAdmin(params);

        return {
            data,
            ...others,
        };
    }
}
