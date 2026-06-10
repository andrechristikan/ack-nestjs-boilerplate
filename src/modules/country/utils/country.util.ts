import { ResponseUtil } from '@common/response/utils/response.util';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { Injectable } from '@nestjs/common';
import { Country } from '@generated/prisma-client';

@Injectable()
export class CountryUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

    mapList(countries: Country[]): CountryResponseDto[] {
        return this.responseUtil.serialize(CountryResponseDto, countries);
    }

    mapOne(country: Country): CountryResponseDto {
        return this.responseUtil.serialize(CountryResponseDto, country);
    }
}
