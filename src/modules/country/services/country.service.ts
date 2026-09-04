import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Country, Prisma } from '@generated/prisma-client';
import { ICountryService } from '@modules/country/interfaces/country.service.interface';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryService implements ICountryService {
    constructor(private readonly countryRepository: CountryRepository) {}

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<Country>> {
        return this.countryRepository.findWithPaginationCursor(pagination);
    }
}
