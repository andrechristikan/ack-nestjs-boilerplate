import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Country, Prisma } from '@generated/prisma-client';
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
