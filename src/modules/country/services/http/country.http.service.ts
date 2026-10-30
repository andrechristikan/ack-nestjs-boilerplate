import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Prisma } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
} from '@modules/country/constants/country.list.constant';
import type { CountryListRequestDto } from '@modules/country/dtos/request/country.list.request.dto';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryHttpService {
    constructor(
        private readonly countryDomain: CountryDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListCursor(
        query: CountryListRequestDto
    ): Promise<IResponsePaginationReturn<Country>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.CountryWhereInput>(query, {
                availableSearch: CountryDefaultAvailableSearch,
                availableOrderBy: CountryDefaultAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.countryDomain.getListCursor(params);
    }
}
