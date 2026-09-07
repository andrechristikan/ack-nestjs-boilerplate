import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Country, Prisma } from '@generated/prisma-client';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
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

    async existById(countryId: string): Promise<{ id: string } | null> {
        return this.countryRepository.existById(countryId);
    }

    async existByAlpha2Code(
        alpha2Code: string
    ): Promise<{ id: string } | null> {
        return this.countryRepository.existByAlpha2Code(alpha2Code);
    }

    async getOne(countryId: string): Promise<Country> {
        const country = await this.countryRepository.findOneById(countryId);
        if (!country) {
            throw new CountryNotFoundException();
        }

        return country;
    }
}
