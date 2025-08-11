import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@modules/country/enums/country.status-code.enum';
import { ICountryService } from '@modules/country/interfaces/country.service.interface';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';
import { CountryRepository } from '@modules/country/repository/repositories/country.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CountryService implements ICountryService {
    constructor(private readonly countryRepository: CountryRepository) {}

    async findAllWithPagination({
        search,
        limit,
        skip,
        order,
    }: IPaginationQueryReturn): Promise<
        IResponsePagingReturn<CountryResponseDto>
    > {
        const { items, ...others } =
            await this.countryRepository.findManyWithPagination({
                where: search,
                limit: limit,
                skip: skip,
                order: order,
            });

        const countries: CountryResponseDto[] = this.mapList(items);

        return {
            data: countries,
            ...others,
        };
    }

    mapList(countries: CountryEntity[]): CountryResponseDto[] {
        return plainToInstance(CountryResponseDto, countries);
    }

    mapOne(country: CountryEntity): CountryResponseDto {
        return plainToInstance(CountryResponseDto, country);
    }

    async findByAlpha2Code(alpha2Code: string): Promise<CountryEntity> {
        const country =
            await this.countryRepository.findOneByAlpha2Code(alpha2Code);
        if (!country) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        return country;
    }
}
