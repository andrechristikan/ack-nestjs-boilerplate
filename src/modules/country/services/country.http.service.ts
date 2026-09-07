import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Country, Prisma } from '@generated/prisma-client';
import { ICountryHttpService } from '@modules/country/interfaces/country.http.service.interface';
import { CountryService } from '@modules/country/services/country.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryHttpService implements ICountryHttpService {
    constructor(private readonly countryService: CountryService) {}

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<Country>> {
        return this.countryService.getListCursor(pagination);
    }
}
