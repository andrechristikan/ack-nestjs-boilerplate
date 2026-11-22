import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    FeatureFlagDefaultAvailableSearch,
    FeatureFlagOrderBy,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import type { FeatureFlagAdminListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumFeatureFlagOrderBy } from '@modules/feature-flag/enums/feature-flag.enum';

@Injectable()
export class FeatureFlagGetListByAdminUseCase implements IAppUseCase<
    [FeatureFlagAdminListRequestDto],
    IResponsePaginationReturn<IFeatureFlag>
> {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: FeatureFlagAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IFeatureFlag>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableSearch: FeatureFlagDefaultAvailableSearch,
            orderBy: FeatureFlagOrderBy,
            defaultOrderBy: EnumFeatureFlagOrderBy.latest,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.featureFlagService.getListByAdmin(params);

        return {
            data,
            ...others,
        };
    }
}
