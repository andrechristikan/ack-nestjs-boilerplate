import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { Injectable } from '@nestjs/common';
import { Country } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CountryUtil {
    mapList(countries: Country[]): CountryResponseDto[] {
        return plainToInstance(CountryResponseDto, countries);
    }

    mapOne(country: Country): CountryResponseDto {
        return plainToInstance(CountryResponseDto, country);
    }
}
