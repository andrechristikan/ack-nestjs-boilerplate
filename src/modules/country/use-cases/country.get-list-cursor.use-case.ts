import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
    CountryPublicListCursorScope,
} from '@modules/country/constants/country.list.constant';
import type { CountryListRequestDto } from '@modules/country/dtos/request/country.list.request.dto';
import { CountryService } from '@modules/country/services/country.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class CountryGetListCursorUseCase implements IAppUseCase<
    [CountryListRequestDto],
    IResponsePaginationReturn<Country>
> {
    constructor(
        private readonly countryService: CountryService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: CountryListRequestDto
    ): Promise<IResponsePaginationReturn<Country>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.CountryWhereInput>(query, {
                scope: CountryPublicListCursorScope,
                availableSearch: CountryDefaultAvailableSearch,
                availableOrderBy: CountryDefaultAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.countryService.getListCursor(params);
    }
}
