import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryService {
    constructor(private readonly countryRepository: CountryRepository) {}

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePaginationReturn<Country>> {
        return this.countryRepository.findWithPaginationCursor(pagination);
    }

    async getIdByAlpha2Code(alpha2Code: string): Promise<string> {
        const countryId =
            await this.countryRepository.findIdByAlpha2Code(alpha2Code);
        if (countryId === null) {
            throw new CountryNotFoundException();
        }

        return countryId;
    }

    async getOne(countryId: string): Promise<Country> {
        const country = await this.countryRepository.findOneById(countryId);
        if (country === null) {
            throw new CountryNotFoundException();
        }

        return country;
    }
}
