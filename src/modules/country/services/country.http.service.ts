import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryHttpService {
    constructor(private readonly countryDomain: CountryDomain) {}

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<Country>> {
        return this.countryDomain.getListCursor(pagination);
    }
}
